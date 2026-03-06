import { Router, Request, Response, NextFunction } from "express";
import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

const router = Router();

interface InvocationLog {
  workflowId: string;
  agentAddress: string;
  qualityScore: number;
  success: boolean;
  timestamp: string;
}

const invocationHistory: InvocationLog[] = [];

router.post("/log-invocation", (req: Request, res: Response) => {
  const { workflowId, agentAddress, qualityScore, success } = req.body;
  const log: InvocationLog = {
    workflowId,
    agentAddress,
    qualityScore,
    success,
    timestamp: new Date().toISOString(),
  };
  invocationHistory.push(log);
  console.log("[invocation]", log);
  res.json({ logged: true });
});

router.get("/history", (_req: Request, res: Response) => {
  res.json(invocationHistory.slice(-100));
});

router.post("/run", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { task, agentAddress, maxBudgetUSDC } = req.body;
    const CRE_ORCHESTRATOR_URL = process.env.CRE_ORCHESTRATOR_URL;
    if (CRE_ORCHESTRATOR_URL) {
      const response = await axios.post(CRE_ORCHESTRATOR_URL, { task, agentAddress, maxBudgetUSDC });
      res.json(response.data);
    } else {
      res.json({
        result: {
          answer: "Simulation mode: set CRE_ORCHESTRATOR_URL",
          keyPoints: [],
        },
        selectedWorkflow: { id: "0x0", name: "Simulation" },
        selectionReasoning: "Simulation mode active",
        qualityScore: 8,
        totalCostUSDC: 0.01,
        paymentTxHash: null,
      });
    }
  } catch (e) {
    next(e);
  }
});

router.post("/cre-service-mock", (req: Request, res: Response) => {
  const task = req.body.task;
  const receipt = req.headers["x-payment-receipt"];
  if (!receipt) {
    res.status(401).json({ error: "Missing x-payment-receipt" });
    return;
  }
  res.json({ answer: `Mock analysis for task: ${task}`, receiptVerified: true });
});

export default router;
