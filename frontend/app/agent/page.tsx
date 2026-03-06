"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import axios from "axios";
import Link from "next/link";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

function AgentPageContent() {
  const { address } = useAccount();
  const searchParams = useSearchParams();
  const [task, setTask] = useState("");
  const [maxBudget, setMaxBudget] = useState("0.05");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const workflowId = searchParams.get("workflowId");
    if (workflowId) {
      setTask(`Run workflow ${workflowId}`);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!address) return;
    axios
      .get(`${BACKEND_URL}/api/x402/balance/${address}`)
      .then((r) => setBalance(r.data.balanceUSDC))
      .catch(() => setBalance(0));
  }, [address]);

  async function runAgent() {
    if (!address) {
      alert("Connect wallet first");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await axios.post(`${BACKEND_URL}/api/agent/run`, {
        task,
        agentAddress: address,
        maxBudgetUSDC: parseFloat(maxBudget),
      });
      setResult(r.data);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Agent Task Console</h1>
      <p className="text-gray-400 mb-6 text-sm">
        The orchestrator agent automatically discovers, selects, and pays for the best workflow for your task.
      </p>

      {address && balance !== null && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex justify-between items-center mb-4">
          <span className="text-sm text-gray-400">Agent USDC Balance</span>
          <span className="text-green-400 font-bold">${balance.toFixed(4)} USDC</span>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4 mb-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Task</label>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="What are the top DeFi yields today?"
            className="w-full h-28 resize-none bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Max Budget (USDC)</label>
          <input
            type="number"
            value={maxBudget}
            onChange={(e) => setMaxBudget(e.target.value)}
            step="0.001"
            min="0"
            className="w-32 bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={runAgent}
          disabled={loading || !task}
          className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-semibold"
        >
          {loading ? "Agent running..." : "⚡ Run Agent Task"}
        </button>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-700 text-red-300 p-4 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {result && (
        <div className="border border-green-800 bg-gray-900 rounded-xl p-6">
          <h2 className="text-green-400 font-bold text-lg mb-4">✅ Task Complete</h2>
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <span className="text-gray-400">Workflow</span>
              <p className="font-semibold">{result.selectedWorkflow?.name}</p>
            </div>
            <div>
              <span className="text-gray-400">Quality Score</span>
              <p className="text-blue-400 font-bold">{result.qualityScore}/10</p>
            </div>
            <div>
              <span className="text-gray-400">Cost</span>
              <p className="font-semibold">${result.totalCostUSDC?.toFixed(4)} USDC</p>
            </div>
            <div>
              <span className="text-gray-400">Transaction</span>
              {result.paymentTxHash ? (
                <a
                  href={`https://sepolia.etherscan.io/tx/${result.paymentTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline text-xs block truncate"
                >
                  {result.paymentTxHash.slice(0, 10)}...
                </a>
              ) : (
                <p className="text-gray-500 text-xs">N/A (simulation)</p>
              )}
            </div>
          </div>
          {result.selectionReasoning && (
            <p className="text-sm text-gray-400 mb-4">{result.selectionReasoning}</p>
          )}
          <pre className="bg-gray-800 rounded p-3 text-xs max-h-64 overflow-auto">
            {JSON.stringify(result.result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function AgentPage() {
  return (
    <Suspense fallback={<div className="text-sm text-gray-400">Loading agent console...</div>}>
      <AgentPageContent />
    </Suspense>
  );
}
