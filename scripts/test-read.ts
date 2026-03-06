import { ethers } from "hardhat";
import * as deployments from "../deployments.json";

async function main() {
    const REGISTRY_ABI = [
        {
            name: "listActive",
            type: "function",
            stateMutability: "view",
            inputs: [],
            outputs: [
                {
                    type: "tuple[]",
                    components: [
                        { name: "id", type: "bytes32" },
                        { name: "name", type: "string" },
                        { name: "priceUSDC", type: "uint256" },
                        { name: "endpoint", type: "string" },
                    ],
                },
            ],
        },
    ];
    const registry = new ethers.Contract(deployments.registryAddress, REGISTRY_ABI, ethers.provider);
    const data = await registry.listActive();
    console.log("length of data:", data.length);
    console.log(data);
}
main().catch(console.error);
