// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import {CampaignRegistry} from "../src/CampaignRegistry.sol";
import {GasStationAccount} from "../src/GasStationAccount.sol";
import {GasStationPaymaster} from "../src/GasStationPaymaster.sol";
import {IEntryPoint} from "../src/interfaces/IEntryPoint.sol";
import {IPaymaster} from "../src/interfaces/IPaymaster.sol";
import {Permit2} from "../src/Permit2.sol";
import {TokenRegistry} from "../src/TokenRegistry.sol";

contract EntryPointHarness {
    function callExecute(GasStationAccount account, address to, uint256 value, bytes calldata data) external {
        account.execute(to, value, data);
    }

    function callPostOp(GasStationPaymaster paymaster, bytes calldata context, uint256 actualGasCost) external {
        paymaster.postOp(IPaymaster.PostOpMode.opSucceeded, context, actualGasCost);
    }
}

contract GasStationPaymasterHarnessRealPermit2 is GasStationPaymaster {
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

contract TestERC20 is ERC20 {
    constructor() ERC20("Test USDT", "tUSDT") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract RealPermit2SettlementTest is Test {
    EntryPointHarness internal entryPoint;
    Permit2 internal permit2;
    TestERC20 internal token;

    TokenRegistry internal tokenRegistry;
    CampaignRegistry internal campaignRegistry;
    GasStationPaymasterHarnessRealPermit2 internal paymaster;
    GasStationAccount internal account;

    uint256 internal ownerPk;
    address internal owner;
    address internal treasury;

    function setUp() public {
        entryPoint = new EntryPointHarness();
        permit2 = new Permit2();
        token = new TestERC20();

        ownerPk = 0xA11CE;
        owner = vm.addr(ownerPk);
        treasury = makeAddr("treasury");

        tokenRegistry = new TokenRegistry(address(this));
        campaignRegistry = new CampaignRegistry(address(this));

        paymaster = new GasStationPaymasterHarnessRealPermit2(
            IEntryPoint(address(entryPoint)),
            treasury,
            makeAddr("quoteSigner"),
            address(permit2),
            tokenRegistry,
            campaignRegistry
        );
        account = new GasStationAccount(IEntryPoint(address(entryPoint)), owner);

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

        token.mint(address(account), 10_000);
        entryPoint.callExecute(
            account,
            address(token),
            0,
            abi.encodeWithSignature("approve(address,uint256)", address(permit2), type(uint256).max)
        );
    }

    function test_postOp_settlesWithRealPermit2() public {
        bytes32 callDataHash = keccak256("demo-call");
        uint48 validUntil = uint48(block.timestamp + 300);

        GasStationPaymaster.PaymasterData memory data;
        data.mode = 2;
        data.validUntil = validUntil;
        data.token = address(token);
        data.maxTokenCharge = 5_000;
        data.tokenPerNativeScaled = 1e18;
        data.permit2Nonce = 77;
        data.permit2Deadline = block.timestamp + 3600;

        bytes32 witness =
            paymaster.exposedComputeWitness(address(account), callDataHash, address(token), data.maxTokenCharge, validUntil);
        bytes32 digest = paymaster.exposedComputePermit2Digest(data, witness);
        bytes memory signature = _sign(ownerPk, digest);

        GasStationPaymaster.TokenPostOpContext memory ctx = GasStationPaymaster.TokenPostOpContext({
            mode: 2,
            token: address(token),
            maxTokenCharge: data.maxTokenCharge,
            tokenPerNativeScaled: data.tokenPerNativeScaled,
            permit2Nonce: data.permit2Nonce,
            permit2Deadline: data.permit2Deadline,
            permit2Signature: signature,
            sender: address(account),
            callDataHash: callDataHash,
            validUntil: validUntil
        });

        bytes memory context = abi.encodePacked(bytes1(uint8(2)), abi.encode(ctx));

        uint256 treasuryBalanceBefore = token.balanceOf(treasury);
        uint256 accountBalanceBefore = token.balanceOf(address(account));

        entryPoint.callPostOp(paymaster, context, 100);

        assertEq(token.balanceOf(treasury) - treasuryBalanceBefore, 103);
        assertEq(accountBalanceBefore - token.balanceOf(address(account)), 103);
    }

    function _sign(uint256 privateKey, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }
}
