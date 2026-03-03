// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";

import {CampaignRegistry} from "../src/CampaignRegistry.sol";
import {GasStationAccount} from "../src/GasStationAccount.sol";
import {GasStationPaymaster} from "../src/GasStationPaymaster.sol";
import {IEntryPoint} from "../src/interfaces/IEntryPoint.sol";
import {UserOperation} from "../src/interfaces/UserOperation.sol";
import {TokenRegistry} from "../src/TokenRegistry.sol";

import {MockEntryPointForPaymaster, MockPermit2, MockERC20Approve, MockTarget, TestCall} from "./mocks/PaymasterMocks.sol";

contract GasStationPaymasterTest is Test {
    bytes32 internal constant EIP712_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 internal constant TOKEN_QUOTE_TYPEHASH = keccak256(
        "TokenQuote(address sender,bytes32 callDataHash,address token,uint48 validUntil,uint256 maxTokenCharge,uint256 tokenPerNativeScaled,uint256 permit2Nonce,uint256 permit2Deadline)"
    );
    bytes32 internal constant SPONSOR_QUOTE_TYPEHASH =
        keccak256("SponsorQuote(address sender,bytes32 callDataHash,bytes32 campaignId,uint48 validUntil)");
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

    bytes4 internal constant EXECUTE_BATCH_SELECTOR = bytes4(keccak256("executeBatch((address,uint256,bytes)[])"));

    MockEntryPointForPaymaster internal entryPoint;
    MockPermit2 internal permit2;
    MockERC20Approve internal token;
    MockTarget internal target;
    MockTarget internal otherTarget;

    TokenRegistry internal tokenRegistry;
    CampaignRegistry internal campaignRegistry;
    GasStationPaymaster internal paymaster;
    GasStationAccount internal senderAccount;

    uint256 internal ownerPk;
    address internal owner;
    uint256 internal quoteSignerPk;
    address internal quoteSigner;
    address internal treasury;

    bytes32 internal campaignId;

    function setUp() public {
        entryPoint = new MockEntryPointForPaymaster();
        permit2 = new MockPermit2();
        token = new MockERC20Approve();
        target = new MockTarget();
        otherTarget = new MockTarget();

        ownerPk = 0xA11CE;
        owner = vm.addr(ownerPk);
        quoteSignerPk = 0xBEEF;
        quoteSigner = vm.addr(quoteSignerPk);
        treasury = makeAddr("treasury");

        tokenRegistry = new TokenRegistry(address(this));
        campaignRegistry = new CampaignRegistry(address(this));

        senderAccount = new GasStationAccount(IEntryPoint(address(entryPoint)), owner);
        paymaster = new GasStationPaymaster(
            IEntryPoint(address(entryPoint)), treasury, quoteSigner, address(permit2), tokenRegistry, campaignRegistry
        );

        campaignRegistry.setPaymaster(address(paymaster));

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

        paymaster.setAllowedTarget(address(target), true);

        campaignId = keccak256("campaign-1");
        _createCampaign(campaignId, 10 ether, 2, uint48(block.timestamp - 1), uint48(block.timestamp + 1 days));
    }

    function test_tokenMode_validateOk() public {
        bytes memory callData = _buildExecuteBatch(true, address(target));
        GasStationPaymaster.PaymasterData memory data = _buildTokenData(callData, true, true, uint48(block.timestamp + 300));
        UserOperation memory userOp = _buildUserOp(callData, data);

        (bytes memory context, uint256 validationData) = entryPoint.callValidate(paymaster, userOp, 1 ether);

        assertTrue(context.length > 0);
        assertEq(uint48(validationData >> 160), data.validUntil);
    }

    function test_tokenMode_expiredValidUntil() public {
        bytes memory callData = _buildExecuteBatch(true, address(target));
        GasStationPaymaster.PaymasterData memory data = _buildTokenData(callData, true, true, uint48(block.timestamp - 1));
        UserOperation memory userOp = _buildUserOp(callData, data);

        vm.expectRevert(bytes("expired"));
        entryPoint.callValidate(paymaster, userOp, 1 ether);
    }

    function test_tokenMode_disabledToken() public {
        tokenRegistry.disableToken(address(token));

        bytes memory callData = _buildExecuteBatch(true, address(target));
        GasStationPaymaster.PaymasterData memory data = _buildTokenData(callData, true, true, uint48(block.timestamp + 300));
        UserOperation memory userOp = _buildUserOp(callData, data);

        vm.expectRevert(bytes("token disabled"));
        entryPoint.callValidate(paymaster, userOp, 1 ether);
    }

    function test_tokenMode_invalidQuoteSig() public {
        bytes memory callData = _buildExecuteBatch(true, address(target));
        GasStationPaymaster.PaymasterData memory data = _buildTokenData(callData, false, true, uint48(block.timestamp + 300));
        UserOperation memory userOp = _buildUserOp(callData, data);

        vm.expectRevert(bytes("invalid token quote sig"));
        entryPoint.callValidate(paymaster, userOp, 1 ether);
    }

    function test_tokenMode_invalidPermit2Sig() public {
        bytes memory callData = _buildExecuteBatch(true, address(target));
        GasStationPaymaster.PaymasterData memory data = _buildTokenData(callData, true, false, uint48(block.timestamp + 300));
        UserOperation memory userOp = _buildUserOp(callData, data);

        vm.expectRevert(bytes("invalid permit2 sig"));
        entryPoint.callValidate(paymaster, userOp, 1 ether);
    }

    function test_tokenMode_nonAllowlistedTarget() public {
        bytes memory callData = _buildExecuteBatch(true, address(otherTarget));
        GasStationPaymaster.PaymasterData memory data = _buildTokenData(callData, true, true, uint48(block.timestamp + 300));
        UserOperation memory userOp = _buildUserOp(callData, data);

        vm.expectRevert(bytes("target not allowed"));
        entryPoint.callValidate(paymaster, userOp, 1 ether);
    }

    function test_sponsorMode_validateOk() public {
        bytes memory callData = _buildExecuteBatch(false, address(target));
        GasStationPaymaster.PaymasterData memory data = _buildSponsorData(callData, uint48(block.timestamp + 300));
        UserOperation memory userOp = _buildUserOp(callData, data);

        (bytes memory context, uint256 validationData) = entryPoint.callValidate(paymaster, userOp, 1 ether);

        (uint8 mode, bytes32 gotCampaignId, address sender) = abi.decode(context, (uint8, bytes32, address));
        assertEq(mode, 1);
        assertEq(gotCampaignId, campaignId);
        assertEq(sender, address(senderAccount));
        assertEq(uint48(validationData >> 160), data.validUntil);
    }

    function test_sponsorMode_expiredCampaign() public {
        bytes memory callData = _buildExecuteBatch(false, address(target));
        GasStationPaymaster.PaymasterData memory data = _buildSponsorData(callData, uint48(block.timestamp + 3 days));
        UserOperation memory userOp = _buildUserOp(callData, data);

        vm.warp(block.timestamp + 2 days);
        vm.expectRevert(bytes("campaign inactive"));
        entryPoint.callValidate(paymaster, userOp, 1 ether);
    }

    function test_sponsorMode_quotaExceeded() public {
        vm.prank(address(paymaster));
        campaignRegistry.recordUsage(campaignId, address(senderAccount), 1);
        vm.prank(address(paymaster));
        campaignRegistry.recordUsage(campaignId, address(senderAccount), 1);

        bytes memory callData = _buildExecuteBatch(false, address(target));
        GasStationPaymaster.PaymasterData memory data = _buildSponsorData(callData, uint48(block.timestamp + 300));
        UserOperation memory userOp = _buildUserOp(callData, data);

        vm.expectRevert(bytes("quota exceeded"));
        entryPoint.callValidate(paymaster, userOp, 1);
    }

    function test_sponsorMode_budgetExceeded() public {
        bytes memory callData = _buildExecuteBatch(false, address(target));
        GasStationPaymaster.PaymasterData memory data = _buildSponsorData(callData, uint48(block.timestamp + 300));
        UserOperation memory userOp = _buildUserOp(callData, data);

        vm.expectRevert(bytes("budget exceeded"));
        entryPoint.callValidate(paymaster, userOp, 100 ether);
    }

    function _createCampaign(bytes32 id, uint256 budget, uint32 perUserMaxOps, uint48 start, uint48 end) internal {
        address[] memory allowed = new address[](1);
        allowed[0] = address(target);

        CampaignRegistry.Campaign memory cfg = CampaignRegistry.Campaign({
            enabled: true,
            start: start,
            end: end,
            budget: budget,
            spent: 0,
            allowedTargets: allowed,
            perUserMaxOps: perUserMaxOps
        });
        campaignRegistry.createCampaign(id, cfg);
    }

    function _buildTokenData(bytes memory callData, bool validQuoteSig, bool validPermitSig, uint48 validUntil)
        internal
        view
        returns (GasStationPaymaster.PaymasterData memory data)
    {
        data.mode = 2;
        data.validUntil = validUntil;
        data.token = address(token);
        data.maxTokenCharge = 1_000_000;
        data.tokenPerNativeScaled = 2e18;
        data.permit2Nonce = 77;
        data.permit2Deadline = block.timestamp + 3600;

        bytes32 callDataHash = keccak256(callData);
        bytes32 tokenQuoteDigest = _tokenQuoteDigest(callDataHash, data);

        uint256 signerForQuote = validQuoteSig ? quoteSignerPk : ownerPk;
        data.signature = _sign(signerForQuote, tokenQuoteDigest);

        bytes32 permitDigest = _permit2Digest(callDataHash, data);
        uint256 signerForPermit = validPermitSig ? ownerPk : quoteSignerPk;
        data.permit2Signature = _sign(signerForPermit, permitDigest);
    }

    function _buildSponsorData(bytes memory callData, uint48 validUntil)
        internal
        view
        returns (GasStationPaymaster.PaymasterData memory data)
    {
        data.mode = 1;
        data.validUntil = validUntil;
        data.campaignId = campaignId;

        bytes32 digest = _sponsorQuoteDigest(keccak256(callData), data.campaignId, validUntil);
        data.signature = _sign(quoteSignerPk, digest);
    }

    function _buildUserOp(bytes memory callData, GasStationPaymaster.PaymasterData memory data)
        internal
        view
        returns (UserOperation memory op)
    {
        op.sender = address(senderAccount);
        op.nonce = 0;
        op.initCode = bytes("");
        op.callData = callData;
        op.callGasLimit = 500_000;
        op.verificationGasLimit = 500_000;
        op.preVerificationGas = 100_000;
        op.maxFeePerGas = 1;
        op.maxPriorityFeePerGas = 1;
        op.paymasterAndData = abi.encodePacked(address(paymaster), abi.encode(data));
        op.signature = bytes("0x01");
    }

    function _buildExecuteBatch(bool includeApprove, address callTarget) internal view returns (bytes memory) {
        if (includeApprove) {
            TestCall[] memory calls = new TestCall[](2);
            calls[0] = TestCall({
                to: address(token),
                value: 0,
                data: abi.encodeWithSelector(MockERC20Approve.approve.selector, address(permit2), type(uint256).max)
            });
            calls[1] = TestCall({to: callTarget, value: 0, data: abi.encodeWithSelector(MockTarget.ping.selector)});
            return abi.encodeWithSelector(EXECUTE_BATCH_SELECTOR, calls);
        }

        TestCall[] memory onlyCall = new TestCall[](1);
        onlyCall[0] = TestCall({to: callTarget, value: 0, data: abi.encodeWithSelector(MockTarget.ping.selector)});
        return abi.encodeWithSelector(EXECUTE_BATCH_SELECTOR, onlyCall);
    }

    function _tokenQuoteDigest(bytes32 callDataHash, GasStationPaymaster.PaymasterData memory data)
        internal
        view
        returns (bytes32)
    {
        bytes32 structHash = keccak256(
            abi.encode(
                TOKEN_QUOTE_TYPEHASH,
                address(senderAccount),
                callDataHash,
                data.token,
                data.validUntil,
                data.maxTokenCharge,
                data.tokenPerNativeScaled,
                data.permit2Nonce,
                data.permit2Deadline
            )
        );
        return keccak256(abi.encodePacked("\x19\x01", paymaster.domainSeparator(), structHash));
    }

    function _sponsorQuoteDigest(bytes32 callDataHash, bytes32 id, uint48 validUntil) internal view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(SPONSOR_QUOTE_TYPEHASH, address(senderAccount), callDataHash, id, validUntil)
        );
        return keccak256(abi.encodePacked("\x19\x01", paymaster.domainSeparator(), structHash));
    }

    function _permit2Digest(bytes32 callDataHash, GasStationPaymaster.PaymasterData memory data)
        internal
        view
        returns (bytes32)
    {
        bytes32 witness = keccak256(
            abi.encode(
                GAS_STATION_WITNESS_TYPEHASH,
                address(senderAccount),
                callDataHash,
                data.token,
                data.maxTokenCharge,
                data.validUntil,
                treasury
            )
        );

        bytes32 tokenPermissionsHash = keccak256(abi.encode(TOKEN_PERMISSIONS_TYPEHASH, data.token, data.maxTokenCharge));
        bytes32 typeHash = keccak256(abi.encodePacked(PERMIT_WITNESS_TRANSFER_FROM_TYPEHASH_STUB, WITNESS_TYPESTRING));
        bytes32 dataHash =
            keccak256(abi.encode(typeHash, tokenPermissionsHash, address(paymaster), data.permit2Nonce, data.permit2Deadline, witness));

        return keccak256(abi.encodePacked("\x19\x01", permit2.DOMAIN_SEPARATOR(), dataHash));
    }

    function _sign(uint256 privateKey, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }
}
