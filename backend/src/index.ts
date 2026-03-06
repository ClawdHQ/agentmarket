import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import registryRoutes from "./routes/registry";
import x402Routes from "./routes/x402";
import agentRoutes from "./routes/agent";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

app.use("/api/registry", registryRoutes);
app.use("/api/x402", x402Routes);
app.use("/api/agent", agentRoutes);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ error: err.message, details: err.details });
});

app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] AgentMarket backend running on :${PORT}`);
});

export default app;
