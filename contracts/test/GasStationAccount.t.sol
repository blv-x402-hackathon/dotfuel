// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";

import {GasStationAccount, Call} from "../src/GasStationAccount.sol";
import {GasStationFactory} from "../src/GasStationFactory.sol";
import {IEntryPoint} from "../src/interfaces/IEntryPoint.sol";
import {UserOperation} from "../src/interfaces/UserOperation.sol";

contract MockEntryPoint {
    function callValidate(
        GasStationAccount account,
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external returns (uint256) {
        return account.validateUserOp(userOp, userOpHash, missingAccountFunds);
    }

    function callExecute(GasStationAccount account, address to, uint256 value, bytes calldata data) external {
        account.execute(to, value, data);
    }

    function callExecuteBatch(GasStationAccount account, Call[] calldata calls) external {
        account.executeBatch(calls);
    }
}

contract CallTarget {
    uint256 public calls;
    uint256 public total;

    function record(uint256 value) external payable {
        calls++;
        total += value;
    }

    function willRevert() external pure {
        revert("boom");
    }
}

contract GasStationAccountTest is Test {
    MockEntryPoint internal entryPoint;
    GasStationAccount internal account;
    GasStationFactory internal factory;

    uint256 internal ownerPk;
    address internal owner;

    uint256 internal otherPk;
    address internal other;

    function setUp() public {
        entryPoint = new MockEntryPoint();

        ownerPk = 0xA11CE;
        owner = vm.addr(ownerPk);

        otherPk = 0xB0B;
        other = vm.addr(otherPk);

        account = new GasStationAccount(IEntryPoint(address(entryPoint)), owner);
        factory = new GasStationFactory(IEntryPoint(address(entryPoint)));
    }

    function test_validateUserOp_validSig() public {
        bytes32 userOpHash = keccak256("valid-user-op");
        bytes memory sig = _sign(ownerPk, userOpHash);

        UserOperation memory op = _makeUserOp(sig);
        uint256 validationData = entryPoint.callValidate(account, op, userOpHash, 0);

        assertEq(validationData, 0);
    }

    function test_validateUserOp_invalidSig() public {
        bytes32 userOpHash = keccak256("invalid-user-op");
        bytes memory sig = _sign(otherPk, userOpHash);

        UserOperation memory op = _makeUserOp(sig);
        uint256 validationData = entryPoint.callValidate(account, op, userOpHash, 0);

        assertEq(validationData, 1);
    }

    function test_validateUserOp_onlyEntryPoint() public {
        bytes32 userOpHash = keccak256("only-entrypoint");
        bytes memory sig = _sign(ownerPk, userOpHash);
        UserOperation memory op = _makeUserOp(sig);

        vm.expectRevert(bytes("not entrypoint"));
        account.validateUserOp(op, userOpHash, 0);
    }

    function test_executeBatch_success() public {
        CallTarget target = new CallTarget();

        Call[] memory calls = new Call[](3);
        calls[0] = Call({to: address(target), value: 0, data: abi.encodeCall(CallTarget.record, (1))});
        calls[1] = Call({to: address(target), value: 0, data: abi.encodeCall(CallTarget.record, (2))});
        calls[2] = Call({to: address(target), value: 0, data: abi.encodeCall(CallTarget.record, (3))});

        entryPoint.callExecuteBatch(account, calls);

        assertEq(target.calls(), 3);
        assertEq(target.total(), 6);
    }

    function test_executeBatch_revertsIfCallFails() public {
        CallTarget target = new CallTarget();

        Call[] memory calls = new Call[](3);
        calls[0] = Call({to: address(target), value: 0, data: abi.encodeCall(CallTarget.record, (1))});
        calls[1] = Call({to: address(target), value: 0, data: abi.encodeCall(CallTarget.willRevert, ())});
        calls[2] = Call({to: address(target), value: 0, data: abi.encodeCall(CallTarget.record, (3))});

        vm.expectRevert(bytes("boom"));
        entryPoint.callExecuteBatch(account, calls);

        // all state changes rolled back due to revert
        assertEq(target.calls(), 0);
        assertEq(target.total(), 0);
    }

    function test_isValidSignature_owner() public {
        bytes32 hash = keccak256("sig-owner");
        bytes memory sig = _sign(ownerPk, hash);

        bytes4 res = account.isValidSignature(hash, sig);
        assertEq(res, bytes4(0x1626ba7e));
    }

    function test_isValidSignature_nonOwner() public {
        bytes32 hash = keccak256("sig-non-owner");
        bytes memory sig = _sign(otherPk, hash);

        bytes4 res = account.isValidSignature(hash, sig);
        assertEq(res, bytes4(0xffffffff));
    }

    function test_factory_deterministicAddress() public {
        uint256 userSalt = 42;
        address predicted = factory.getAddress(owner, userSalt);

        GasStationAccount deployed = factory.createAccount(owner, userSalt);

        assertEq(address(deployed), predicted);
    }

    function test_factory_idempotent() public {
        uint256 userSalt = 77;

        GasStationAccount first = factory.createAccount(owner, userSalt);
        GasStationAccount second = factory.createAccount(owner, userSalt);

        assertEq(address(first), address(second));
    }

    function test_factory_ownerCorrect() public {
        uint256 userSalt = 999;
        GasStationAccount deployed = factory.createAccount(owner, userSalt);

        assertEq(deployed.owner(), owner);
    }

    function _makeUserOp(bytes memory sig) internal pure returns (UserOperation memory op) {
        op.sender = address(0xBEEF);
        op.nonce = 0;
        op.initCode = bytes("");
        op.callData = bytes("");
        op.callGasLimit = 100_000;
        op.verificationGasLimit = 100_000;
        op.preVerificationGas = 21_000;
        op.maxFeePerGas = 1;
        op.maxPriorityFeePerGas = 1;
        op.paymasterAndData = bytes("");
        op.signature = sig;
    }

    function _sign(uint256 privateKey, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }
}
