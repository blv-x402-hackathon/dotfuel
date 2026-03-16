// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IAccount} from "./interfaces/IAccount.sol";
import {IEntryPoint} from "./interfaces/IEntryPoint.sol";
import {UserOperation} from "./interfaces/UserOperation.sol";

struct Call {
    address to;
    uint256 value;
    bytes data;
}

contract GasStationAccount is IAccount {
    bytes4 internal constant EIP1271_SUCCESS = 0x1626ba7e;
    uint256 internal constant SECP256K1N_HALF =
        0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;

    address public owner;
    IEntryPoint public immutable entryPoint;

    modifier onlyEntryPoint() {
        require(msg.sender == address(entryPoint), "not entrypoint");
        _;
    }

    constructor(IEntryPoint _entryPoint, address _owner) {
        require(address(_entryPoint) != address(0), "entrypoint=0");
        require(_owner != address(0), "owner=0");
        entryPoint = _entryPoint;
        owner = _owner;
    }

    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external onlyEntryPoint returns (uint256 validationData) {
        validationData = _validateSignature(userOpHash, userOp.signature) ? 0 : 1;

        if (missingAccountFunds > 0) {
            (bool ok,) = payable(msg.sender).call{value: missingAccountFunds}("");
            require(ok, "fund transfer failed");
        }
    }

    function execute(address to, uint256 value, bytes calldata data) external onlyEntryPoint {
        (bool ok, bytes memory ret) = to.call{value: value}(data);
        if (!ok) {
            assembly {
                revert(add(ret, 0x20), mload(ret))
            }
        }
    }

    function executeBatch(Call[] calldata calls) external onlyEntryPoint {
        uint256 length = calls.length;
        for (uint256 i = 0; i < length; i++) {
            (bool ok, bytes memory ret) = calls[i].to.call{value: calls[i].value}(calls[i].data);
            if (!ok) {
                assembly {
                    revert(add(ret, 0x20), mload(ret))
                }
            }
        }
    }

    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4) {
        return _validateSignature(hash, signature) ? EIP1271_SUCCESS : bytes4(0xffffffff);
    }

    function _validateSignature(bytes32 hash, bytes memory signature) internal view returns (bool) {
        return _recoverSigner(hash, signature) == owner;
    }

    function _recoverSigner(bytes32 hash, bytes memory signature) internal pure returns (address) {
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
        if (uint256(s) > SECP256K1N_HALF) {
            return address(0);
        }

        return ecrecover(hash, v, r, s);
    }

    receive() external payable {}
}
