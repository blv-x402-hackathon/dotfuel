// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";

import {CampaignRegistry} from "../src/CampaignRegistry.sol";
import {GasStationPaymaster} from "../src/GasStationPaymaster.sol";
import {IEntryPoint} from "../src/interfaces/IEntryPoint.sol";
import {TokenRegistry} from "../src/TokenRegistry.sol";

import {MockEntryPointForPaymaster, MockPermit2, MockERC20Approve} from "./mocks/PaymasterMocks.sol";

contract GasStationPaymasterHarness is GasStationPaymaster {
    constructor(
        IEntryPoint _entryPoint,
        address _treasury,
        address _quoteSigner,
        address _permit2,
        TokenRegistry _tokenRegistry,
        CampaignRegistry _campaignRegistry
    ) GasStationPaymaster(_entryPoint, _treasury, _quoteSigner, _permit2, _tokenRegistry, _campaignRegistry) {}

    function exposedComputeWitness(
        address sender,
        bytes32 callDataHash,
        address token,
        uint256 maxTokenCharge,
        uint48 validUntil
    ) external view returns (bytes32) {
        return _computeWitness(sender, callDataHash, token, maxTokenCharge, validUntil);
    }

    function exposedComputePermit2Digest(PaymasterData memory data, bytes32 witness) external view returns (bytes32) {
        return _computePermit2Digest(data, witness);
    }
}

contract Permit2DigestTest is Test {
    bytes32 internal constant GAS_STATION_WITNESS_TYPEHASH = keccak256(
        "GasStationWitness(address sender,bytes32 callDataHash,address token,uint256 maxTokenCharge,uint48 validUntil,address treasury)"
    );
    bytes32 internal constant TOKEN_PERMISSIONS_TYPEHASH = keccak256("TokenPermissions(address token,uint256 amount)");

    string internal constant PERMIT_WITNESS_TRANSFER_FROM_TYPEHASH_STUB =
        "PermitWitnessTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline,";
    string internal constant WITNESS_TYPESTRING =
        "GasStationWitness witness)"
        "GasStationWitness(address sender,bytes32 callDataHash,address token,uint256 maxTokenCharge,uint48 validUntil,address treasury)"
        "TokenPermissions(address token,uint256 amount)";

    MockEntryPointForPaymaster internal entryPoint;
    MockPermit2 internal permit2;
    MockERC20Approve internal token;

    TokenRegistry internal tokenRegistry;
    CampaignRegistry internal campaignRegistry;
    GasStationPaymasterHarness internal paymaster;

    address internal sender;
    address internal treasury;

    function setUp() public {
        entryPoint = new MockEntryPointForPaymaster();
        permit2 = new MockPermit2();
        token = new MockERC20Approve();

        sender = makeAddr("sender");
        treasury = makeAddr("treasury");

        tokenRegistry = new TokenRegistry(address(this));
        campaignRegistry = new CampaignRegistry(address(this));

        paymaster = new GasStationPaymasterHarness(
            IEntryPoint(address(entryPoint)), treasury, makeAddr("quoteSigner"), address(permit2), tokenRegistry, campaignRegistry
        );
    }

    function test_witness_matches_expected() public {
        bytes32 callDataHash = keccak256("callData");
        uint256 maxTokenCharge = 1_000_000;
        uint48 validUntil = uint48(block.timestamp + 300);

        bytes32 onchain = paymaster.exposedComputeWitness(sender, callDataHash, address(token), maxTokenCharge, validUntil);
        bytes32 expected = keccak256(
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

        assertEq(onchain, expected);
    }

    function test_permitDigest_matches_expected() public {
        GasStationPaymaster.PaymasterData memory data = _data(77);
        bytes32 callDataHash = keccak256("callData");

        bytes32 witness =
            paymaster.exposedComputeWitness(sender, callDataHash, data.token, data.maxTokenCharge, data.validUntil);
        bytes32 onchain = paymaster.exposedComputePermit2Digest(data, witness);

        bytes32 tokenPermissionsHash = keccak256(abi.encode(TOKEN_PERMISSIONS_TYPEHASH, data.token, data.maxTokenCharge));
        bytes32 typeHash = keccak256(abi.encodePacked(PERMIT_WITNESS_TRANSFER_FROM_TYPEHASH_STUB, WITNESS_TYPESTRING));
        bytes32 dataHash = keccak256(
            abi.encode(typeHash, tokenPermissionsHash, address(paymaster), data.permit2Nonce, data.permit2Deadline, witness)
        );
        bytes32 expected = keccak256(abi.encodePacked("\x19\x01", permit2.DOMAIN_SEPARATOR(), dataHash));

        assertEq(onchain, expected);
    }

    function test_permitDigest_changesWithNonce() public {
        bytes32 callDataHash = keccak256("callData");

        GasStationPaymaster.PaymasterData memory d1 = _data(1);
        bytes32 w1 = paymaster.exposedComputeWitness(sender, callDataHash, d1.token, d1.maxTokenCharge, d1.validUntil);
        bytes32 digest1 = paymaster.exposedComputePermit2Digest(d1, w1);

        GasStationPaymaster.PaymasterData memory d2 = _data(2);
        bytes32 w2 = paymaster.exposedComputeWitness(sender, callDataHash, d2.token, d2.maxTokenCharge, d2.validUntil);
        bytes32 digest2 = paymaster.exposedComputePermit2Digest(d2, w2);

        assertTrue(digest1 != digest2);
    }

    function test_permitDigest_changesWithCallDataHash() public {
        GasStationPaymaster.PaymasterData memory data = _data(3);

        bytes32 w1 = paymaster.exposedComputeWitness(sender, keccak256("c1"), data.token, data.maxTokenCharge, data.validUntil);
        bytes32 d1 = paymaster.exposedComputePermit2Digest(data, w1);

        bytes32 w2 = paymaster.exposedComputeWitness(sender, keccak256("c2"), data.token, data.maxTokenCharge, data.validUntil);
        bytes32 d2 = paymaster.exposedComputePermit2Digest(data, w2);

        assertTrue(d1 != d2);
    }

    function testFuzz_permit2DigestDeterministic(
        uint256 nonce,
        uint256 deadline,
        uint256 maxTokenCharge,
        uint48 validUntil,
        bytes32 callDataHash
    ) public {
        nonce = bound(nonce, 1, type(uint64).max);
        deadline = bound(deadline, block.timestamp + 1, type(uint48).max);
        maxTokenCharge = bound(maxTokenCharge, 1, type(uint128).max);
        validUntil = uint48(bound(uint256(validUntil), block.timestamp + 1, type(uint48).max));

        GasStationPaymaster.PaymasterData memory data;
        data.mode = 2;
        data.validUntil = validUntil;
        data.token = address(token);
        data.maxTokenCharge = maxTokenCharge;
        data.tokenPerNativeScaled = 2e18;
        data.permit2Nonce = nonce;
        data.permit2Deadline = deadline;

        bytes32 witness =
            paymaster.exposedComputeWitness(sender, callDataHash, data.token, data.maxTokenCharge, data.validUntil);

        bytes32 digest1 = paymaster.exposedComputePermit2Digest(data, witness);
        bytes32 digest2 = paymaster.exposedComputePermit2Digest(data, witness);

        assertEq(digest1, digest2);
    }

    function _data(uint256 nonce) internal view returns (GasStationPaymaster.PaymasterData memory data) {
        data.mode = 2;
        data.validUntil = uint48(block.timestamp + 300);
        data.token = address(token);
        data.maxTokenCharge = 1_000_000;
        data.tokenPerNativeScaled = 2e18;
        data.permit2Nonce = nonce;
        data.permit2Deadline = block.timestamp + 3600;
    }
}
