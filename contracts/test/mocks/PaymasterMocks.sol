// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {GasStationPaymaster} from "../../src/GasStationPaymaster.sol";
import {IPaymaster} from "../../src/interfaces/IPaymaster.sol";
import {IPermit2} from "../../src/interfaces/IPermit2.sol";
import {UserOperation} from "../../src/interfaces/UserOperation.sol";

struct TestCall {
    address to;
    uint256 value;
    bytes data;
}

contract MockEntryPointForPaymaster {
    function callValidate(GasStationPaymaster paymaster, UserOperation calldata userOp, uint256 maxCost)
        external
        view
        returns (bytes memory context, uint256 validationData)
    {
        return paymaster.validatePaymasterUserOp(userOp, bytes32(0), maxCost);
    }

    function callPostOp(GasStationPaymaster paymaster, bytes calldata context, uint256 actualGasCost) external {
        paymaster.postOp(IPaymaster.PostOpMode.opSucceeded, context, actualGasCost);
    }
}

contract MockPermit2 is IPermit2 {
    bytes32 public immutable override DOMAIN_SEPARATOR;

    address public lastToken;
    uint256 public lastRequestedAmount;
    uint256 public lastPermitAmount;
    uint256 public lastNonce;
    uint256 public lastDeadline;
    address public lastOwner;
    bytes32 public lastWitness;
    string public lastWitnessTypeString;
    bytes public lastSignature;

    constructor() {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("Permit2")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    function permitWitnessTransferFrom(
        PermitTransferFrom memory permit,
        SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes32 witness,
        string calldata witnessTypeString,
        bytes calldata signature
    ) external override {
        lastToken = permit.permitted.token;
        lastPermitAmount = permit.permitted.amount;
        lastNonce = permit.nonce;
        lastDeadline = permit.deadline;
        lastRequestedAmount = transferDetails.requestedAmount;
        lastOwner = owner;
        lastWitness = witness;
        lastWitnessTypeString = witnessTypeString;
        lastSignature = signature;
    }
}

contract MockERC20Approve {
    mapping(address => mapping(address => uint256)) public allowance;

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
}

contract MockTarget {
    uint256 public calls;

    function ping() external {
        calls += 1;
    }

    function fail() external pure {
        revert("target fail");
    }
}
