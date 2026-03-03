// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract CampaignRegistry {
    struct Campaign {
        bool enabled;
        uint48 start;
        uint48 end;
        uint256 budget;
        uint256 spent;
        address[] allowedTargets;
        uint32 perUserMaxOps;
    }

    mapping(bytes32 => Campaign) private _campaigns;
    mapping(bytes32 => mapping(address => uint32)) public userOpsUsed;

    address public admin;
    address public paymaster;

    event CampaignCreated(bytes32 indexed campaignId, Campaign cfg);
    event CampaignFunded(bytes32 indexed campaignId, uint256 amount);
    event CampaignDisabled(bytes32 indexed campaignId);
    event CampaignTargetsUpdated(bytes32 indexed campaignId, address[] allowedTargets);
    event PaymasterSet(address indexed paymaster);

    modifier onlyAdmin() {
        require(msg.sender == admin, "not admin");
        _;
    }

    modifier onlyPaymaster() {
        require(msg.sender == paymaster, "not paymaster");
        _;
    }

    constructor(address _admin) {
        require(_admin != address(0), "admin=0");
        admin = _admin;
    }

    function setPaymaster(address _paymaster) external onlyAdmin {
        require(_paymaster != address(0), "paymaster=0");
        paymaster = _paymaster;
        emit PaymasterSet(_paymaster);
    }

    function createCampaign(bytes32 campaignId, Campaign calldata cfg) external onlyAdmin {
        Campaign storage c = _campaigns[campaignId];
        require(c.end == 0, "campaign exists");
        require(cfg.end >= cfg.start, "invalid time window");

        c.enabled = cfg.enabled;
        c.start = cfg.start;
        c.end = cfg.end;
        c.budget = cfg.budget;
        c.spent = cfg.spent;
        c.perUserMaxOps = cfg.perUserMaxOps;

        uint256 length = cfg.allowedTargets.length;
        for (uint256 i = 0; i < length; i++) {
            c.allowedTargets.push(cfg.allowedTargets[i]);
        }

        emit CampaignCreated(campaignId, c);
    }

    function fundCampaign(bytes32 campaignId) external payable onlyAdmin {
        Campaign storage c = _campaigns[campaignId];
        require(c.end != 0, "campaign not found");
        c.budget += msg.value;
        emit CampaignFunded(campaignId, msg.value);
    }

    function disableCampaign(bytes32 campaignId) external onlyAdmin {
        Campaign storage c = _campaigns[campaignId];
        require(c.end != 0, "campaign not found");
        c.enabled = false;
        emit CampaignDisabled(campaignId);
    }

    function setAllowedTargets(bytes32 campaignId, address[] calldata allowedTargets) external onlyAdmin {
        Campaign storage c = _campaigns[campaignId];
        require(c.end != 0, "campaign not found");

        delete c.allowedTargets;
        uint256 length = allowedTargets.length;
        for (uint256 i = 0; i < length; i++) {
            c.allowedTargets.push(allowedTargets[i]);
        }

        emit CampaignTargetsUpdated(campaignId, allowedTargets);
    }

    function isAllowedTarget(bytes32 campaignId, address target) external view returns (bool) {
        address[] storage targets = _campaigns[campaignId].allowedTargets;
        uint256 length = targets.length;
        for (uint256 i = 0; i < length; i++) {
            if (targets[i] == target) {
                return true;
            }
        }
        return false;
    }

    function recordUsage(bytes32 campaignId, address user, uint256 gasCost) external onlyPaymaster {
        Campaign storage c = _campaigns[campaignId];
        require(c.enabled, "campaign disabled");
        require(block.timestamp >= c.start && block.timestamp <= c.end, "campaign inactive");

        uint256 nextSpent = c.spent + gasCost;
        require(nextSpent <= c.budget, "budget exceeded");

        uint32 used = userOpsUsed[campaignId][user];
        if (c.perUserMaxOps > 0) {
            require(used < c.perUserMaxOps, "user quota exceeded");
        }

        c.spent = nextSpent;
        userOpsUsed[campaignId][user] = used + 1;
    }

    function getCampaign(bytes32 campaignId) external view returns (Campaign memory) {
        return _campaigns[campaignId];
    }
}
