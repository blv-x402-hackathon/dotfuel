// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {EntryPoint} from "@account-abstraction/contracts/core/EntryPoint.sol";
import {Script} from "forge-std/Script.sol";

import {CampaignRegistry} from "../src/CampaignRegistry.sol";
import {DemoDapp} from "../src/DemoDapp.sol";
import {GasStationFactory} from "../src/GasStationFactory.sol";
import {GasStationPaymaster} from "../src/GasStationPaymaster.sol";
import {IEntryPoint} from "../src/interfaces/IEntryPoint.sol";
import {Permit2} from "../src/Permit2.sol";
import {TokenRegistry} from "../src/TokenRegistry.sol";

contract DeployScript is Script {
    struct Deployment {
        uint256 chainId;
        address entryPoint;
        address permit2;
        address tokenRegistry;
        address campaignRegistry;
        address factory;
        address paymaster;
        address demoDapp;
        uint256 deployedAt;
    }

    function run() external returns (Deployment memory deployed) {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address quoteSigner = vm.envAddress("QUOTE_SIGNER_ADDRESS");
        address existingEntryPoint = vm.envOr("ENTRYPOINT_ADDRESS", address(0));
        address existingPermit2 = vm.envOr("PERMIT2_ADDRESS", address(0));
        uint256 paymasterDeposit = vm.envOr("PAYMASTER_DEPOSIT_WEI", uint256(1 ether));

        vm.startBroadcast(privateKey);

        address entryPointAddress = existingEntryPoint;
        if (entryPointAddress == address(0)) {
            entryPointAddress = address(new EntryPoint());
        }

        address permit2Address = existingPermit2;
        if (permit2Address == address(0)) {
            permit2Address = address(new Permit2());
        }

        IEntryPoint entryPoint = IEntryPoint(entryPointAddress);
        address deployer = vm.addr(privateKey);
        TokenRegistry tokenRegistry = new TokenRegistry(deployer);
        CampaignRegistry campaignRegistry = new CampaignRegistry(deployer);

        GasStationFactory factory = new GasStationFactory(entryPoint);

        GasStationPaymaster paymaster = new GasStationPaymaster(
            entryPoint,
            treasury,
            quoteSigner,
            permit2Address,
            tokenRegistry,
            campaignRegistry
        );

        campaignRegistry.setPaymaster(address(paymaster));
        entryPoint.depositTo{value: paymasterDeposit}(address(paymaster));

        DemoDapp demoDapp = new DemoDapp();

        vm.stopBroadcast();

        deployed = Deployment({
            chainId: block.chainid,
            entryPoint: entryPointAddress,
            permit2: permit2Address,
            tokenRegistry: address(tokenRegistry),
            campaignRegistry: address(campaignRegistry),
            factory: address(factory),
            paymaster: address(paymaster),
            demoDapp: address(demoDapp),
            deployedAt: block.timestamp
        });

        _writeDeploymentJson(deployed);
    }

    function _writeDeploymentJson(Deployment memory d) internal {
        string memory root = "deployment";
        vm.serializeUint(root, "chainId", d.chainId);
        vm.serializeAddress(root, "entryPoint", d.entryPoint);
        vm.serializeAddress(root, "permit2", d.permit2);
        vm.serializeAddress(root, "tokenRegistry", d.tokenRegistry);
        vm.serializeAddress(root, "campaignRegistry", d.campaignRegistry);
        vm.serializeAddress(root, "factory", d.factory);
        vm.serializeAddress(root, "paymaster", d.paymaster);
        vm.serializeAddress(root, "demoDapp", d.demoDapp);
        string memory output = vm.serializeUint(root, "deployedAt", d.deployedAt);

        vm.writeJson(output, "../deployments/testnet.json");
    }
}
