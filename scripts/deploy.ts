import { ethers } from "hardhat";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // 1. Deploy WorkflowRegistry
  const WorkflowRegistry = await ethers.getContractFactory("WorkflowRegistry");
  const registry = await WorkflowRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("WorkflowRegistry:", registryAddress);

  // 2. Deploy AgentPaymentVault
  const AgentPaymentVault = await ethers.getContractFactory("AgentPaymentVault");
  const vault = await AgentPaymentVault.deploy(process.env.USDC_SEPOLIA!, registryAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("AgentPaymentVault:", vaultAddress);

  // 3. Configure contracts
  await registry.setPaymentVault(vaultAddress);
  await vault.setCRERelayer(deployer.address);
  console.log("Registry and Vault configured");

  // 4. Save deployment info
  const deployments = {
    registryAddress,
    vaultAddress,
    network: "sepolia",
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync("deployments.json", JSON.stringify(deployments, null, 2));
  console.log("Saved to deployments.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
