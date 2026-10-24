// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {A2AHub} from "../src/A2AHub.sol";

contract Deploy is Script {
    function run() external returns (A2AHub hub) {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(pk);
        hub = new A2AHub();
        vm.stopBroadcast();
        console.log("A2AHub deployed at:", address(hub));
    }
}
