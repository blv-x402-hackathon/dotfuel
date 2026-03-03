// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract TokenRegistry {
    struct TokenConfig {
        bool enabled;
        uint8 decimals;
        uint16 markupBps;
        uint256 minMaxCharge;
        uint256 maxMaxCharge;
    }

    mapping(address => TokenConfig) public tokenConfig;
    address public admin;

    event TokenSet(address indexed token, TokenConfig cfg);
    event TokenDisabled(address indexed token);

    modifier onlyAdmin() {
        require(msg.sender == admin, "not admin");
        _;
    }

    constructor(address _admin) {
        require(_admin != address(0), "admin=0");
        admin = _admin;
    }

    function setToken(address token, TokenConfig calldata cfg) external onlyAdmin {
        require(token != address(0), "token=0");
        require(cfg.minMaxCharge <= cfg.maxMaxCharge, "invalid charge range");
        tokenConfig[token] = cfg;
        emit TokenSet(token, cfg);
    }

    function disableToken(address token) external onlyAdmin {
        TokenConfig storage cfg = tokenConfig[token];
        cfg.enabled = false;
        emit TokenDisabled(token);
    }

    function getToken(address token) external view returns (TokenConfig memory) {
        return tokenConfig[token];
    }
}
