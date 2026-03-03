// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IPermit2} from "./interfaces/IPermit2.sol";

contract Permit2Mock is IPermit2 {
    bytes32 public immutable override DOMAIN_SEPARATOR;

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
        PermitTransferFrom memory,
        SignatureTransferDetails calldata,
        address,
        bytes32,
        string calldata,
        bytes calldata
    ) external pure override {}
}
