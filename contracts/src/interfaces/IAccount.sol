// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {UserOperation} from "./UserOperation.sol";

interface IAccount {
    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external returns (uint256 validationData);
}
