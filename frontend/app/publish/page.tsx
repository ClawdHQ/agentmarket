"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import axios from "axios";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function PublishPage() {
  const { address } = useAccount();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [priceUSDC, setPriceUSDC] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) {
      alert("Connect wallet first");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await axios.post(`${BACKEND_URL}/api/registry/publish`, {
        name,
        description,
        endpoint,
        priceUSDC: parseFloat(priceUSDC),
      });
      setResult(r.data);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Publish a CRE Workflow</h1>
      <p className="text-gray-400 mb-6 text-sm">
        List your Chainlink CRE workflow as a paid service on AgentMarket
      </p>

      <form
        onSubmit={onSubmit}
        className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4 mb-4"
      >
        <div>
          <label className="block text-sm text-gray-400 mb-1">Workflow Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="DeFi Yield Aggregator"
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what your workflow does..."
            required
            className="w-full h-20 resize-none bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Endpoint URL</label>
          <input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://your-cre-trigger-url.example.com"
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Price in USDC</label>
          <input
            type="number"
            value={priceUSDC}
            onChange={(e) => setPriceUSDC(e.target.value)}
            step="0.001"
            min="0"
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed w-full py-2 rounded-lg font-semibold"
        >
          {loading ? "Publishing..." : "Publish Workflow"}
        </button>
      </form>

      {result && (
        <div className="border border-green-800 bg-gray-900 p-4 rounded-lg mb-4">
          <h2 className="text-green-400 font-bold mb-2">✅ Published!</h2>
          <p className="text-sm text-gray-400 mb-1">Workflow ID:</p>
          <code className="text-xs bg-gray-800 p-2 rounded block break-all mb-2">
            {result.workflowId}
          </code>
          <a
            href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline text-sm"
          >
            View on Etherscan →
          </a>
        </div>
      )}

      {error && (
        <div className="border border-red-700 text-red-300 p-4 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
