// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract DemoDapp {
    event ActionExecuted(address indexed account, string message, uint256 timestamp);

    mapping(address => uint256) public actionCount;

    function execute(string calldata message) external {
        actionCount[msg.sender] += 1;
        emit ActionExecuted(msg.sender, message, block.timestamp);
    }

    function getActionCount(address account) external view returns (uint256) {
        return actionCount[account];
    }
}
