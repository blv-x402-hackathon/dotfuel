// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {CampaignRegistry} from "./CampaignRegistry.sol";
import {TokenRegistry} from "./TokenRegistry.sol";
import {IEntryPoint} from "./interfaces/IEntryPoint.sol";
import {IPaymaster} from "./interfaces/IPaymaster.sol";
import {IPermit2} from "./interfaces/IPermit2.sol";
import {UserOperation} from "./interfaces/UserOperation.sol";

contract GasStationPaymaster is IPaymaster {
    struct AccountCall {
        address to;
        uint256 value;
        bytes data;
    }

    uint8 internal constant MODE_SPONSOR = 1;
    uint8 internal constant MODE_TOKEN_PERMIT2 = 2;

    bytes4 internal constant EIP1271_SUCCESS = 0x1626ba7e;
    bytes4 internal constant EXECUTE_BATCH_SELECTOR = bytes4(keccak256("executeBatch((address,uint256,bytes)[])"));
    bytes4 internal constant ERC20_APPROVE_SELECTOR = 0x095ea7b3;

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

    uint256 internal constant MAX_CALLDATA_BYTES = 8192;

    IEntryPoint public immutable entryPoint;
    address public immutable treasury;
    address public immutable quoteSigner;
    address public immutable permit2;
    TokenRegistry public immutable tokenRegistry;
    CampaignRegistry public immutable campaignRegistry;

    address public admin;
    mapping(address => bool) public allowedTargets;

    struct PaymasterData {
        uint8 mode;
        uint48 validUntil;
        bytes signature;

        bytes32 campaignId;

        address token;
        uint256 maxTokenCharge;
        uint256 tokenPerNativeScaled;
        uint256 permit2Nonce;
        uint256 permit2Deadline;
        bytes permit2Signature;
    }

    struct TokenPostOpContext {
        uint8 mode;
        address token;
        uint256 maxTokenCharge;
        uint256 tokenPerNativeScaled;
        uint256 permit2Nonce;
        uint256 permit2Deadline;
        bytes permit2Signature;
        address sender;
        bytes32 callDataHash;
        uint48 validUntil;
    }

    bytes32 private immutable _DOMAIN_SEPARATOR;

    event TokenGasPaid(address indexed sender, address indexed token, uint256 charge, uint256 gasCost);
    event Sponsored(address indexed sender, bytes32 indexed campaignId, uint256 gasCost);
    event AllowedTargetSet(address indexed target, bool allowed);

    modifier onlyEntryPoint() {
        require(msg.sender == address(entryPoint), "not entrypoint");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "not admin");
        _;
    }

    constructor(
        IEntryPoint _entryPoint,
        address _treasury,
        address _quoteSigner,
        address _permit2,
        TokenRegistry _tokenRegistry,
        CampaignRegistry _campaignRegistry
    ) {
        require(address(_entryPoint) != address(0), "entrypoint=0");
        require(_treasury != address(0), "treasury=0");
        require(_quoteSigner != address(0), "quoteSigner=0");
        require(_permit2 != address(0), "permit2=0");
        require(address(_tokenRegistry) != address(0), "tokenRegistry=0");
        require(address(_campaignRegistry) != address(0), "campaignRegistry=0");

        entryPoint = _entryPoint;
        treasury = _treasury;
        quoteSigner = _quoteSigner;
        permit2 = _permit2;
        tokenRegistry = _tokenRegistry;
        campaignRegistry = _campaignRegistry;
        admin = msg.sender;

        _DOMAIN_SEPARATOR = _buildDomainSeparator();
    }

    function setAllowedTarget(address target, bool allowed) external onlyAdmin {
        allowedTargets[target] = allowed;
        emit AllowedTargetSet(target, allowed);
    }

    function _buildDomainSeparator() private view returns (bytes32) {
        return keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes("GasStationPaymaster")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    function domainSeparator() external view returns (bytes32) {
        return _DOMAIN_SEPARATOR;
    }

    function _verifyTokenQuote(address sender, bytes32 callDataHash, PaymasterData memory data) internal view {
        bytes32 structHash = keccak256(
            abi.encode(
                TOKEN_QUOTE_TYPEHASH,
                sender,
                callDataHash,
                data.token,
                data.validUntil,
                data.maxTokenCharge,
                data.tokenPerNativeScaled,
                data.permit2Nonce,
                data.permit2Deadline
            )
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _DOMAIN_SEPARATOR, structHash));
        require(_recover(digest, data.signature) == quoteSigner, "invalid token quote sig");
    }

    function _verifySponsorQuote(address sender, bytes32 callDataHash, PaymasterData memory data) internal view {
        bytes32 structHash =
            keccak256(abi.encode(SPONSOR_QUOTE_TYPEHASH, sender, callDataHash, data.campaignId, data.validUntil));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _DOMAIN_SEPARATOR, structHash));
        require(_recover(digest, data.signature) == quoteSigner, "invalid sponsor quote sig");
    }

    function _computeWitness(
        address sender,
        bytes32 callDataHash,
        address token,
        uint256 maxTokenCharge,
        uint48 validUntil
    ) internal view returns (bytes32) {
        return keccak256(
            abi.encode(GAS_STATION_WITNESS_TYPEHASH, sender, callDataHash, token, maxTokenCharge, validUntil, treasury)
        );
    }

    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32,
        uint256
    ) external view override onlyEntryPoint returns (bytes memory context, uint256 validationData) {
        PaymasterData memory data = _decodePaymasterData(userOp.paymasterAndData);

        if (data.mode == MODE_TOKEN_PERMIT2) {
            return _validateTokenMode(userOp, data);
        }

        revert("unsupported mode");
    }

    function postOp(PostOpMode, bytes calldata context, uint256 actualGasCost) external override onlyEntryPoint {
        TokenPostOpContext memory ctx = abi.decode(context, (TokenPostOpContext));
        require(ctx.mode == MODE_TOKEN_PERMIT2, "unsupported mode");

        (, , uint16 markupBps,,) = tokenRegistry.tokenConfig(ctx.token);

        uint256 raw = (actualGasCost * ctx.tokenPerNativeScaled + 1e18 - 1) / 1e18;
        uint256 charge = raw + (raw * markupBps + 9999) / 10_000;
        if (charge > ctx.maxTokenCharge) {
            charge = ctx.maxTokenCharge;
        }

        bytes32 witness =
            _computeWitness(ctx.sender, ctx.callDataHash, ctx.token, ctx.maxTokenCharge, ctx.validUntil);

        IPermit2(permit2).permitWitnessTransferFrom(
            IPermit2.PermitTransferFrom({
                permitted: IPermit2.TokenPermissions({token: ctx.token, amount: ctx.maxTokenCharge}),
                nonce: ctx.permit2Nonce,
                deadline: ctx.permit2Deadline
            }),
            IPermit2.SignatureTransferDetails({to: treasury, requestedAmount: charge}),
            ctx.sender,
            witness,
            WITNESS_TYPESTRING,
            ctx.permit2Signature
        );

        emit TokenGasPaid(ctx.sender, ctx.token, charge, actualGasCost);
    }

    function _decodePaymasterData(bytes calldata paymasterAndData) internal pure returns (PaymasterData memory data) {
        require(paymasterAndData.length > 20, "invalid paymasterAndData");
        data = abi.decode(paymasterAndData[20:], (PaymasterData));
    }

    function _validateTokenMode(UserOperation calldata userOp, PaymasterData memory data)
        internal
        view
        returns (bytes memory context, uint256 validationData)
    {
        require(block.timestamp <= data.validUntil, "expired");
        (bool enabled,, uint16 markupBps, uint256 minMaxCharge, uint256 maxMaxCharge) =
            tokenRegistry.tokenConfig(data.token);
        require(enabled, "token disabled");
        require(markupBps <= 10_000, "invalid markup");
        require(data.maxTokenCharge >= minMaxCharge, "maxTokenCharge too low");
        require(data.maxTokenCharge <= maxMaxCharge, "maxTokenCharge too high");
        require(userOp.callData.length <= MAX_CALLDATA_BYTES, "calldata too large");

        bytes32 callDataHash = keccak256(userOp.callData);
        _verifyTokenQuote(userOp.sender, callDataHash, data);

        bytes32 witness = _computeWitness(userOp.sender, callDataHash, data.token, data.maxTokenCharge, data.validUntil);
        bytes32 permitDigest = _computePermit2Digest(data, witness);
        require(_isValidSignatureNow(userOp.sender, permitDigest, data.permit2Signature), "invalid permit2 sig");

        _validateExecuteBatchTargets(userOp.callData, data.token);

        TokenPostOpContext memory ctx = TokenPostOpContext({
            mode: MODE_TOKEN_PERMIT2,
            token: data.token,
            maxTokenCharge: data.maxTokenCharge,
            tokenPerNativeScaled: data.tokenPerNativeScaled,
            permit2Nonce: data.permit2Nonce,
            permit2Deadline: data.permit2Deadline,
            permit2Signature: data.permit2Signature,
            sender: userOp.sender,
            callDataHash: callDataHash,
            validUntil: data.validUntil
        });

        context = abi.encode(ctx);
        validationData = _packValidationData(0, data.validUntil, 0);
    }

    function _computePermit2Digest(PaymasterData memory data, bytes32 witness) internal view returns (bytes32) {
        bytes32 tokenPermissionsHash = keccak256(abi.encode(TOKEN_PERMISSIONS_TYPEHASH, data.token, data.maxTokenCharge));
        bytes32 typeHash = keccak256(abi.encodePacked(PERMIT_WITNESS_TRANSFER_FROM_TYPEHASH_STUB, WITNESS_TYPESTRING));
        bytes32 dataHash = keccak256(
            abi.encode(typeHash, tokenPermissionsHash, address(this), data.permit2Nonce, data.permit2Deadline, witness)
        );
        return keccak256(abi.encodePacked("\x19\x01", IPermit2(permit2).DOMAIN_SEPARATOR(), dataHash));
    }

    function _validateExecuteBatchTargets(bytes calldata callData, address token) internal view {
        require(callData.length >= 4, "invalid calldata");
        bytes4 selector;
        assembly {
            selector := calldataload(callData.offset)
        }
        require(selector == EXECUTE_BATCH_SELECTOR, "unsupported call selector");

        AccountCall[] memory calls = abi.decode(callData[4:], (AccountCall[]));

        uint256 length = calls.length;
        for (uint256 i = 0; i < length; i++) {
            if (_isPermit2ApproveCall(calls[i], token)) {
                continue;
            }
            require(allowedTargets[calls[i].to], "target not allowed");
        }
    }

    function _isPermit2ApproveCall(AccountCall memory c, address token) internal view returns (bool) {
        if (c.to != token) {
            return false;
        }
        if (c.data.length != 68) {
            return false;
        }

        bytes memory payload = c.data;
        bytes4 selector;
        address spender;
        assembly {
            selector := mload(add(payload, 0x20))
            spender := shr(96, mload(add(payload, 0x24)))
        }

        return selector == ERC20_APPROVE_SELECTOR && spender == permit2;
    }

    function _isValidSignatureNow(address signer, bytes32 digest, bytes memory signature) internal view returns (bool) {
        if (signer.code.length > 0) {
            (bool ok, bytes memory ret) = signer.staticcall(
                abi.encodeWithSelector(EIP1271_SUCCESS, digest, signature)
            );
            if (!ok || ret.length < 32) {
                return false;
            }
            bytes4 magic;
            assembly {
                magic := mload(add(ret, 0x20))
            }
            return magic == EIP1271_SUCCESS;
        }

        return _recover(digest, signature) == signer;
    }

    function _packValidationData(uint256 sigFailed, uint48 validUntil, uint48 validAfter)
        internal
        pure
        returns (uint256)
    {
        return sigFailed | (uint256(validUntil) << 160) | (uint256(validAfter) << 208);
    }

    function _recover(bytes32 digest, bytes memory signature) internal pure returns (address) {
        if (signature.length != 65) {
            return address(0);
        }

        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }

        if (v < 27) {
            v += 27;
        }
        if (v != 27 && v != 28) {
            return address(0);
        }

        return ecrecover(digest, v, r, s);
    }
}
