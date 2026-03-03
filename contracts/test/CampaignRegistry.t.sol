// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {CampaignRegistry} from "../src/CampaignRegistry.sol";

contract CampaignRegistryTest is Test {
    CampaignRegistry internal registry;

    address internal admin;
    address internal paymaster;
    address internal user;
    address internal target1;
    address internal target2;
    bytes32 internal campaignId;

    function setUp() public {
        admin = makeAddr("admin");
        paymaster = makeAddr("paymaster");
        user = makeAddr("user");
        target1 = makeAddr("target1");
        target2 = makeAddr("target2");
        campaignId = keccak256("campaign-1");

        registry = new CampaignRegistry(admin);

        vm.prank(admin);
        registry.setPaymaster(paymaster);
    }

    function test_createCampaign_andGet() public {
        CampaignRegistry.Campaign memory cfg = _campaign(uint48(block.timestamp), uint48(block.timestamp + 1 days), 1 ether);

        vm.prank(admin);
        registry.createCampaign(campaignId, cfg);

        CampaignRegistry.Campaign memory got = registry.getCampaign(campaignId);
        assertEq(got.enabled, true);
        assertEq(got.start, cfg.start);
        assertEq(got.end, cfg.end);
        assertEq(got.budget, cfg.budget);
        assertEq(got.spent, 0);
        assertEq(got.perUserMaxOps, cfg.perUserMaxOps);
        assertEq(got.allowedTargets.length, 2);
        assertEq(got.allowedTargets[0], target1);
        assertEq(got.allowedTargets[1], target2);
    }

    function test_fundCampaign() public {
        CampaignRegistry.Campaign memory cfg = _campaign(uint48(block.timestamp), uint48(block.timestamp + 1 days), 0);

        vm.prank(admin);
        registry.createCampaign(campaignId, cfg);

        vm.deal(admin, 2 ether);
        vm.prank(admin);
        registry.fundCampaign{value: 1 ether}(campaignId);

        CampaignRegistry.Campaign memory got = registry.getCampaign(campaignId);
        assertEq(got.budget, 1 ether);
    }

    function test_isAllowedTarget_true() public {
        CampaignRegistry.Campaign memory cfg = _campaign(uint48(block.timestamp), uint48(block.timestamp + 1 days), 1 ether);

        vm.prank(admin);
        registry.createCampaign(campaignId, cfg);

        bool allowed = registry.isAllowedTarget(campaignId, target1);
        assertTrue(allowed);
    }

    function test_isAllowedTarget_false() public {
        CampaignRegistry.Campaign memory cfg = _campaign(uint48(block.timestamp), uint48(block.timestamp + 1 days), 1 ether);

        vm.prank(admin);
        registry.createCampaign(campaignId, cfg);

        bool allowed = registry.isAllowedTarget(campaignId, makeAddr("unknown-target"));
        assertFalse(allowed);
    }

    function test_recordUsage_incrementsSpent() public {
        CampaignRegistry.Campaign memory cfg = _campaign(uint48(block.timestamp), uint48(block.timestamp + 1 days), 1 ether);

        vm.prank(admin);
        registry.createCampaign(campaignId, cfg);

        vm.prank(paymaster);
        registry.recordUsage(campaignId, user, 0.2 ether);

        CampaignRegistry.Campaign memory got = registry.getCampaign(campaignId);
        assertEq(got.spent, 0.2 ether);
        assertEq(registry.userOpsUsed(campaignId, user), 1);
    }

    function test_recordUsage_onlyPaymaster() public {
        CampaignRegistry.Campaign memory cfg = _campaign(uint48(block.timestamp), uint48(block.timestamp + 1 days), 1 ether);

        vm.prank(admin);
        registry.createCampaign(campaignId, cfg);

        vm.prank(user);
        vm.expectRevert(bytes("not paymaster"));
        registry.recordUsage(campaignId, user, 1);
    }

    function test_campaign_timeWindow() public {
        uint48 start = uint48(block.timestamp + 100);
        uint48 end = uint48(block.timestamp + 200);
        CampaignRegistry.Campaign memory cfg = _campaign(start, end, 1 ether);

        vm.prank(admin);
        registry.createCampaign(campaignId, cfg);

        vm.warp(start - 1);
        vm.prank(paymaster);
        vm.expectRevert(bytes("campaign inactive"));
        registry.recordUsage(campaignId, user, 1);

        vm.warp(start);
        vm.prank(paymaster);
        registry.recordUsage(campaignId, user, 1);

        vm.warp(end + 1);
        vm.prank(paymaster);
        vm.expectRevert(bytes("campaign inactive"));
        registry.recordUsage(campaignId, makeAddr("user2"), 1);
    }

    function _campaign(
        uint48 start,
        uint48 end,
        uint256 budget
    ) internal view returns (CampaignRegistry.Campaign memory cfg) {
        address[] memory allowed = new address[](2);
        allowed[0] = target1;
        allowed[1] = target2;

        cfg = CampaignRegistry.Campaign({
            enabled: true,
            start: start,
            end: end,
            budget: budget,
            spent: 0,
            allowedTargets: allowed,
            perUserMaxOps: 5
        });
    }
}
