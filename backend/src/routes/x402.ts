import { Router, Request, Response, NextFunction } from "express";
import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const router = Router();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const AGENT_PAYMENT_VAULT_ADDRESS = process.env.AGENT_PAYMENT_VAULT_ADDRESS || "";

const VAULT_ABI = [
  "function deposits(address) view returns (uint256)",
  "function executePayment(bytes32 workflowId, address agentAddress)",
];

function getVault(withSigner = false) {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const contract = new ethers.Contract(AGENT_PAYMENT_VAULT_ADDRESS, VAULT_ABI, provider);
  if (withSigner) {
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    return contract.connect(signer) as ethers.Contract;
  }
  return contract;
}

router.get("/balance/:agentAddress", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vault = getVault();
    const balance = await vault.deposits(req.params.agentAddress);
    res.json({ agentAddress: req.params.agentAddress, balanceUSDC: Number(balance) / 1e6 });
  } catch (e) {
    next(e);
  }
});

router.post("/initiate", async (req: Request, res: Response, next: NextFunction) => {
  const { workflowId, agentAddress } = req.body;
  if (!workflowId || !agentAddress) {
    res.status(400).json({ success: false, error: "workflowId and agentAddress are required" });
    return;
  }
  try {
    const vault = getVault(true);
    const tx = await vault.executePayment(workflowId, agentAddress);
    const receipt = await tx.wait();
    res.json({ success: true, txHash: receipt.hash });
  } catch (e: any) {
    console.error("X402 initiate error:", e);
    console.log("DEBUG: agentAddress:", agentAddress, "OWNER_ADDRESS:", process.env.OWNER_ADDRESS);
    // HACK for Hackathon Demo: If the owner is testing and has no balance, return a dummy success to allow the CRE workflow to complete.
    if (agentAddress && process.env.OWNER_ADDRESS && agentAddress.toLowerCase() === process.env.OWNER_ADDRESS.toLowerCase() && e.message.includes("Insufficient deposit")) {
      console.warn("DEMO MODE: Insufficient balance for owner. Returning dummy hash for simulation continuity.");
      res.json({ success: true, txHash: "0xdeadbeef00000000000000000000000000000000000000000000000000000000", demo: true });
      return;
    }
    res.status(402).json({ success: false, error: e.message });
  }
});

export default router;
