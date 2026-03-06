import { ethers } from "hardhat";
import * as deployments from "../deployments.json";

const REGISTRY_ABI = ["function publishWorkflow(string,string,string,uint256) returns (bytes32)"];

const seedWorkflows = [
  {
    name: "DeFi Yield Summarizer",
    description: "Fetches and ranks APYs from Aave, Compound, Morpho",
    endpoint: "http://localhost:3001/api/agent/cre-service-mock",
    priceUSDC: 0.01,
  },
  {
    name: "Crypto News Analyst",
    description: "Searches and summarizes latest crypto/DeFi news",
    endpoint: "http://localhost:3001/api/agent/cre-service-mock",
    priceUSDC: 0.005,
  },
  {
    name: "Portfolio Risk Scorer",
    description: "Returns risk score 0-100 for a token portfolio",
    endpoint: "http://localhost:3001/api/agent/cre-service-mock",
    priceUSDC: 0.02,
  },
];

async function main() {
  const [signer] = await ethers.getSigners();
  const registry = new ethers.Contract(deployments.registryAddress, REGISTRY_ABI, signer);

  for (const w of seedWorkflows) {
    const tx = await registry.publishWorkflow(
      w.name,
      w.description,
      w.endpoint,
      Math.floor(w.priceUSDC * 1e6)
    );
    const receipt = await tx.wait();
    console.log(`Published "${w.name}" → ${receipt.hash}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
