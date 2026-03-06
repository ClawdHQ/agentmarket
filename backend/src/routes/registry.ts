import { Router, Request, Response, NextFunction } from "express";
import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const router = Router();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const WORKFLOW_REGISTRY_ADDRESS = process.env.WORKFLOW_REGISTRY_ADDRESS || "";

const REGISTRY_ABI = [
  "function listActive() view returns (tuple(bytes32 id, string name, string description, string endpoint, uint256 priceUSDC, address owner, uint256 reputationScore, uint256 totalInvocations, bool active)[])",
  "function getWorkflow(bytes32 id) view returns (tuple(bytes32 id, string name, string description, string endpoint, uint256 priceUSDC, address owner, uint256 reputationScore, uint256 totalInvocations, bool active))",
  "function publishWorkflow(string name, string description, string endpoint, uint256 priceUSDC) returns (bytes32)",
  "event WorkflowPublished(bytes32 indexed id, string name, address indexed owner, uint256 priceUSDC)",
];

function formatWorkflow(w: any) {
  return {
    id: w.id,
    name: w.name,
    description: w.description,
    endpoint: w.endpoint,
    priceUSDC: Number(w.priceUSDC) / 1e6,
    owner: w.owner,
    reputationScore: Number(w.reputationScore),
    totalInvocations: Number(w.totalInvocations),
    active: w.active,
  };
}

function getContract(withSigner = false) {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const contract = new ethers.Contract(WORKFLOW_REGISTRY_ADDRESS, REGISTRY_ABI, provider);
  if (withSigner) {
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    return contract.connect(signer) as ethers.Contract;
  }
  return contract;
}

router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const contract = getContract();
    const workflows = await contract.listActive();
    res.json(workflows.map(formatWorkflow));
  } catch (e) {
    next(e);
  }
});

router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contract = getContract();
    const result = await contract.getWorkflow(req.params.id);
    res.json(formatWorkflow(result));
  } catch (e) {
    next(e);
  }
});

router.post("/publish", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, endpoint, priceUSDC } = req.body;
    const priceInMicro = Math.floor(priceUSDC * 1e6);
    const contract = getContract(true);
    const tx = await contract.publishWorkflow(name, description, endpoint, priceInMicro);
    const receipt = await tx.wait();
    const iface = new ethers.Interface(REGISTRY_ABI);
    let workflowId: string | null = null;
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed && parsed.name === "WorkflowPublished") {
          workflowId = parsed.args[0];
          break;
        }
      } catch {
        // skip non-matching logs
      }
    }
    res.json({ success: true, txHash: receipt.hash, workflowId });
  } catch (e) {
    next(e);
  }
});

export default router;
