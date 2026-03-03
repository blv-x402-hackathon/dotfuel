// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {GasStationAccount} from "./GasStationAccount.sol";
import {IEntryPoint} from "./interfaces/IEntryPoint.sol";

contract GasStationFactory {
    IEntryPoint public immutable entryPoint;

    constructor(IEntryPoint _entryPoint) {
        require(address(_entryPoint) != address(0), "entrypoint=0");
        entryPoint = _entryPoint;
    }

    function getAddress(address owner, uint256 userSalt) public view returns (address) {
        bytes32 salt = _accountSalt(owner, userSalt);
        bytes memory initCode = abi.encodePacked(type(GasStationAccount).creationCode, abi.encode(entryPoint, owner));
        bytes32 initCodeHash = keccak256(initCode);
        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, initCodeHash));
        return address(uint160(uint256(hash)));
    }

    function createAccount(address owner, uint256 userSalt) public returns (GasStationAccount) {
        address predicted = getAddress(owner, userSalt);
        if (predicted.code.length > 0) {
            return GasStationAccount(payable(predicted));
        }

        bytes32 salt = _accountSalt(owner, userSalt);
        return new GasStationAccount{salt: salt}(entryPoint, owner);
    }

    function _accountSalt(address owner, uint256 userSalt) internal pure returns (bytes32) {
        return keccak256(abi.encode(owner, userSalt));
    }
}
