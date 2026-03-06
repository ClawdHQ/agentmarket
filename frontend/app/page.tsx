"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import WorkflowCard from "@/components/WorkflowCard";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

interface Workflow {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  priceUSDC: number;
  owner: string;
  reputationScore: number;
  totalInvocations: number;
}

export default function MarketplacePage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/api/registry`)
      .then((r) => setWorkflows(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">CRE Workflow Marketplace</h1>
          <p className="text-gray-400 mt-1">Discover and use AI-powered Chainlink CRE workflows</p>
        </div>
        <span className="bg-blue-900 text-blue-300 border border-blue-700 rounded-full px-3 py-1 text-sm">
          ⛓ Powered by Chainlink CRE + x402
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p>No workflows yet.</p>
          <Link href="/publish" className="text-blue-400 hover:underline">
            Publish the first one!
          </Link>
        </div>
      ) : (
        <>
          <p className="text-gray-500 text-sm mb-4">{workflows.length} workflow(s) available</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map((w) => (
              <WorkflowCard key={w.id} workflow={w} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
