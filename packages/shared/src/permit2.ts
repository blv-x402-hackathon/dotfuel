import { encodeAbiParameters, keccak256, toHex } from "viem";
import type { Address, Hex } from "viem";

export interface GasStationWitness {
  sender: Address;
  callDataHash: Hex;
  token: Address;
  maxTokenCharge: bigint;
  validUntil: bigint;
  treasury: Address;
}

export interface BuildPermit2TypedDataParams {
  chainId: number;
  permit2Address: Address;
  spender: Address;
  token: Address;
  amount: bigint;
  nonce: bigint;
  deadline: bigint;
  witness: GasStationWitness;
}

export function buildWitness(params: GasStationWitness): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "bytes32" },
        { type: "address" },
        { type: "bytes32" },
        { type: "address" },
        { type: "uint256" },
        { type: "uint48" },
        { type: "address" }
      ],
      [
        keccak256(
          toHex(
            "GasStationWitness(address sender,bytes32 callDataHash,address token,uint256 maxTokenCharge,uint48 validUntil,address treasury)"
          )
        ),
        params.sender,
        params.callDataHash,
        params.token,
        params.maxTokenCharge,
        Number(params.validUntil),
        params.treasury
      ]
    )
  );
}

export function buildPermit2TypedData(params: BuildPermit2TypedDataParams) {
  return {
    domain: {
      name: "Permit2",
      version: "1",
      chainId: params.chainId,
      verifyingContract: params.permit2Address
    },
    primaryType: "PermitWitnessTransferFrom",
    types: {
      TokenPermissions: [
        { name: "token", type: "address" },
        { name: "amount", type: "uint256" }
      ],
      GasStationWitness: [
        { name: "sender", type: "address" },
        { name: "callDataHash", type: "bytes32" },
        { name: "token", type: "address" },
        { name: "maxTokenCharge", type: "uint256" },
        { name: "validUntil", type: "uint48" },
        { name: "treasury", type: "address" }
      ],
      PermitWitnessTransferFrom: [
        { name: "permitted", type: "TokenPermissions" },
        { name: "spender", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "witness", type: "GasStationWitness" }
      ]
    },
    message: {
      permitted: {
        token: params.token,
        amount: params.amount
      },
      spender: params.spender,
      nonce: params.nonce,
      deadline: params.deadline,
      witness: params.witness
    }
  } as const;
}

export function encodePermit2Signature(sig: Hex): Hex {
  return sig;
}
