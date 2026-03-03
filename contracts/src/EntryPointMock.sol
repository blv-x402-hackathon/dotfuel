// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IEntryPoint} from "./interfaces/IEntryPoint.sol";
import {UserOperation} from "./interfaces/UserOperation.sol";

contract EntryPointMock is IEntryPoint {
    mapping(address => DepositInfo) internal _deposits;
    mapping(address => mapping(uint192 => uint256)) internal _nonces;

    function handleOps(UserOperation[] calldata, address payable) external override {}

    function depositTo(address account) external payable override {
        _deposits[account].deposit += uint112(msg.value);
    }

    function getDepositInfo(address account) external view override returns (DepositInfo memory info) {
        info = _deposits[account];
    }

    function getNonce(address sender, uint192 key) external view override returns (uint256 nonce) {
        nonce = _nonces[sender][key];
    }

    function getUserOpHash(UserOperation calldata userOp) external pure override returns (bytes32) {
        return keccak256(
            abi.encode(
                userOp.sender,
                userOp.nonce,
                keccak256(userOp.initCode),
                keccak256(userOp.callData),
                userOp.callGasLimit,
                userOp.verificationGasLimit,
                userOp.preVerificationGas,
                userOp.maxFeePerGas,
                userOp.maxPriorityFeePerGas,
                keccak256(userOp.paymasterAndData),
                keccak256(userOp.signature)
            )
        );
    }
}
