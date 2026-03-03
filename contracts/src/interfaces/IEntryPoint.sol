// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {UserOperation} from "./UserOperation.sol";

interface IEntryPoint {
    struct DepositInfo {
        uint112 deposit;
        bool staked;
        uint112 stake;
        uint32 unstakeDelaySec;
        uint48 withdrawTime;
    }

    function handleOps(UserOperation[] calldata ops, address payable beneficiary) external;

    function depositTo(address account) external payable;

    function getDepositInfo(address account) external view returns (DepositInfo memory info);

    function getNonce(address sender, uint192 key) external view returns (uint256 nonce);

    function getUserOpHash(UserOperation calldata userOp) external view returns (bytes32);
}
