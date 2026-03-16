// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {SignatureTransfer} from "@permit2/src/SignatureTransfer.sol";

// DotFuel only needs Permit2's SignatureTransfer surface for witness-bound settlement.
contract Permit2 is SignatureTransfer {}
