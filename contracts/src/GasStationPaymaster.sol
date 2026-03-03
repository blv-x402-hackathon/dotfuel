// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {CampaignRegistry} from "./CampaignRegistry.sol";
import {TokenRegistry} from "./TokenRegistry.sol";
import {IEntryPoint} from "./interfaces/IEntryPoint.sol";
import {IPaymaster} from "./interfaces/IPaymaster.sol";
import {UserOperation} from "./interfaces/UserOperation.sol";

contract GasStationPaymaster is IPaymaster {
    uint8 internal constant MODE_SPONSOR = 1;
    uint8 internal constant MODE_TOKEN_PERMIT2 = 2;

    IEntryPoint public immutable entryPoint;
    address public immutable treasury;
    address public immutable quoteSigner;
    address public immutable permit2;
    TokenRegistry public immutable tokenRegistry;
    CampaignRegistry public immutable campaignRegistry;

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

    bytes32 private immutable _DOMAIN_SEPARATOR;

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

    string internal constant WITNESS_TYPESTRING =
        "GasStationWitness(address sender,bytes32 callDataHash,address token,uint256 maxTokenCharge,uint48 validUntil,address treasury)"
        "TokenPermissions(address token,uint256 amount)";

    uint256 internal constant MAX_CALLDATA_BYTES = 8192;

    event TokenGasPaid(address indexed sender, address indexed token, uint256 charge, uint256 gasCost);
    event Sponsored(address indexed sender, bytes32 indexed campaignId, uint256 gasCost);

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

        _DOMAIN_SEPARATOR = _buildDomainSeparator();
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

    function _verifyTokenQuote(address sender, bytes32 callDataHash, PaymasterData calldata data) internal view {
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

    function _verifySponsorQuote(address sender, bytes32 callDataHash, PaymasterData calldata data) internal view {
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
        UserOperation calldata,
        bytes32,
        uint256
    ) external pure override returns (bytes memory, uint256) {
        revert("not implemented");
    }

    function postOp(PostOpMode, bytes calldata, uint256) external pure override {
        revert("not implemented");
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
