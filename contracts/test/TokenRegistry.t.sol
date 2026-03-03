// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {TokenRegistry} from "../src/TokenRegistry.sol";

contract TokenRegistryTest is Test {
    event TokenSet(address indexed token, TokenRegistry.TokenConfig cfg);
    event TokenDisabled(address indexed token);

    TokenRegistry internal registry;
    address internal admin;
    address internal nonAdmin;
    address internal token;

    function setUp() public {
        admin = makeAddr("admin");
        nonAdmin = makeAddr("nonAdmin");
        token = makeAddr("token");
        registry = new TokenRegistry(admin);
    }

    function test_setToken_andGet() public {
        TokenRegistry.TokenConfig memory cfg = _cfg(true, 6, 300, 1e6, 1e9);

        vm.prank(admin);
        registry.setToken(token, cfg);

        TokenRegistry.TokenConfig memory got = registry.getToken(token);
        assertEq(got.enabled, cfg.enabled);
        assertEq(got.decimals, cfg.decimals);
        assertEq(got.markupBps, cfg.markupBps);
        assertEq(got.minMaxCharge, cfg.minMaxCharge);
        assertEq(got.maxMaxCharge, cfg.maxMaxCharge);
    }

    function test_disableToken() public {
        TokenRegistry.TokenConfig memory cfg = _cfg(true, 6, 300, 1e6, 1e9);
        vm.prank(admin);
        registry.setToken(token, cfg);

        vm.prank(admin);
        registry.disableToken(token);

        TokenRegistry.TokenConfig memory got = registry.getToken(token);
        assertEq(got.enabled, false);
        assertEq(got.decimals, 6);
        assertEq(got.markupBps, 300);
        assertEq(got.minMaxCharge, 1e6);
        assertEq(got.maxMaxCharge, 1e9);
    }

    function test_onlyAdmin_setToken() public {
        TokenRegistry.TokenConfig memory cfg = _cfg(true, 6, 300, 1e6, 1e9);

        vm.prank(nonAdmin);
        vm.expectRevert(bytes("not admin"));
        registry.setToken(token, cfg);
    }

    function test_onlyAdmin_disableToken() public {
        vm.prank(nonAdmin);
        vm.expectRevert(bytes("not admin"));
        registry.disableToken(token);
    }

    function test_setToken_emitsEvent() public {
        TokenRegistry.TokenConfig memory cfg = _cfg(true, 6, 300, 1e6, 1e9);

        vm.prank(admin);
        vm.expectEmit(true, false, false, true);
        emit TokenSet(token, cfg);
        registry.setToken(token, cfg);
    }

    function _cfg(
        bool enabled,
        uint8 decimals,
        uint16 markupBps,
        uint256 minMaxCharge,
        uint256 maxMaxCharge
    ) internal pure returns (TokenRegistry.TokenConfig memory cfg) {
        cfg = TokenRegistry.TokenConfig({
            enabled: enabled,
            decimals: decimals,
            markupBps: markupBps,
            minMaxCharge: minMaxCharge,
            maxMaxCharge: maxMaxCharge
        });
    }
}
