// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";

import {CampaignRegistry} from "../src/CampaignRegistry.sol";
import {GasStationPaymaster} from "../src/GasStationPaymaster.sol";
import {IEntryPoint} from "../src/interfaces/IEntryPoint.sol";
import {IPaymaster} from "../src/interfaces/IPaymaster.sol";
import {TokenRegistry} from "../src/TokenRegistry.sol";

import {MockEntryPointForPaymaster, MockPermit2, MockERC20Approve} from "./mocks/PaymasterMocks.sol";

contract PostOpSettlementTest is Test {
    bytes32 internal constant GAS_STATION_WITNESS_TYPEHASH = keccak256(
        "GasStationWitness(address sender,bytes32 callDataHash,address token,uint256 maxTokenCharge,uint48 validUntil,address treasury)"
    );

    MockEntryPointForPaymaster internal entryPoint;
    MockPermit2 internal permit2;
    MockERC20Approve internal token;

    TokenRegistry internal tokenRegistry;
    CampaignRegistry internal campaignRegistry;
    GasStationPaymaster internal paymaster;

    address internal treasury;
    address internal sender;

    function setUp() public {
        entryPoint = new MockEntryPointForPaymaster();
        permit2 = new MockPermit2();
        token = new MockERC20Approve();

        treasury = makeAddr("treasury");
        sender = makeAddr("sender");

        tokenRegistry = new TokenRegistry(address(this));
        campaignRegistry = new CampaignRegistry(address(this));

        paymaster = new GasStationPaymaster(
            IEntryPoint(address(entryPoint)), treasury, makeAddr("quoteSigner"), address(permit2), tokenRegistry, campaignRegistry
        );

        tokenRegistry.setToken(
            address(token),
            TokenRegistry.TokenConfig({
                enabled: true,
                decimals: 6,
                markupBps: 300,
                minMaxCharge: 1,
                maxMaxCharge: type(uint256).max
            })
        );
    }

    function test_postOp_chargeAtCeiling() public {
        bytes memory context = _tokenContext(100, 2e18, 1, 3600, bytes32(uint256(11)), uint48(block.timestamp + 1000));

        entryPoint.callPostOp(paymaster, context, 1_000_000);

        assertEq(permit2.lastRequestedAmount(), 100);
    }

    function test_postOp_chargeRounding() public {
        // raw ceil: ceil(1 * (1e18 + 1) / 1e18) = 2
        // markup ceil: ceil(2 * 300 / 10000) = 1, total = 3
        bytes memory context = _tokenContext(1000, 1e18 + 1, 1, 3600, bytes32(uint256(22)), uint48(block.timestamp + 1000));

        entryPoint.callPostOp(paymaster, context, 1);
        assertEq(permit2.lastRequestedAmount(), 3);

        // remainder 0 case: raw=100, markup=3, total=103
        context = _tokenContext(1000, 1e18, 2, 3601, bytes32(uint256(23)), uint48(block.timestamp + 1000));
        entryPoint.callPostOp(paymaster, context, 100);
        assertEq(permit2.lastRequestedAmount(), 103);
    }

    function test_postOp_onlyEntryPoint() public {
        bytes memory context = _tokenContext(1000, 1e18, 1, 3600, bytes32(uint256(33)), uint48(block.timestamp + 1000));

        vm.expectRevert(bytes("not entrypoint"));
        paymaster.postOp(IPaymaster.PostOpMode.opSucceeded, context, 1);
    }

    function test_postOp_permit2CalledCorrectly() public {
        uint256 maxTokenCharge = 5000;
        uint256 nonce = 1234;
        uint256 deadline = block.timestamp + 7200;
        bytes32 callDataHash = keccak256("callDataHash");
        uint48 validUntil = uint48(block.timestamp + 1000);

        bytes memory signature = hex"010203";

        GasStationPaymaster.TokenPostOpContext memory ctx = GasStationPaymaster.TokenPostOpContext({
            mode: 2,
            token: address(token),
            maxTokenCharge: maxTokenCharge,
            tokenPerNativeScaled: 1e18,
            permit2Nonce: nonce,
            permit2Deadline: deadline,
            permit2Signature: signature,
            sender: sender,
            callDataHash: callDataHash,
            validUntil: validUntil
        });
        bytes memory context = abi.encodePacked(bytes1(uint8(2)), abi.encode(ctx));

        entryPoint.callPostOp(paymaster, context, 100);

        assertEq(permit2.lastToken(), address(token));
        assertEq(permit2.lastPermitAmount(), maxTokenCharge);
        assertEq(permit2.lastRequestedAmount(), 103); // 100 + 3% markup
        assertEq(permit2.lastNonce(), nonce);
        assertEq(permit2.lastDeadline(), deadline);
        assertEq(permit2.lastOwner(), sender);
        assertEq(permit2.lastSignature(), signature);

        bytes32 expectedWitness = keccak256(
            abi.encode(
                GAS_STATION_WITNESS_TYPEHASH,
                sender,
                callDataHash,
                address(token),
                maxTokenCharge,
                validUntil,
                treasury
            )
        );
        assertEq(permit2.lastWitness(), expectedWitness);
    }

    function _tokenContext(
        uint256 maxTokenCharge,
        uint256 tokenPerNativeScaled,
        uint256 nonce,
        uint256 deadline,
        bytes32 callDataHash,
        uint48 validUntil
    ) internal view returns (bytes memory) {
        GasStationPaymaster.TokenPostOpContext memory ctx = GasStationPaymaster.TokenPostOpContext({
            mode: 2,
            token: address(token),
            maxTokenCharge: maxTokenCharge,
            tokenPerNativeScaled: tokenPerNativeScaled,
            permit2Nonce: nonce,
            permit2Deadline: deadline,
            permit2Signature: hex"1234",
            sender: sender,
            callDataHash: callDataHash,
            validUntil: validUntil
        });
        return abi.encodePacked(bytes1(uint8(2)), abi.encode(ctx));
    }
}
