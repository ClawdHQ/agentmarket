import Link from "next/link";

interface WorkflowProps {
  workflow: {
    id: string;
    name: string;
    description: string;
    priceUSDC: number;
    reputationScore: number;
    totalInvocations: number;
    owner: string;
  };
}

export default function WorkflowCard({ workflow }: WorkflowProps) {
  const repColor =
    workflow.reputationScore >= 75
      ? "bg-green-500"
      : workflow.reputationScore >= 50
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-blue-700 transition flex flex-col gap-3">
      <p className="font-semibold text-lg">{workflow.name}</p>
      <p className="text-gray-400 text-sm line-clamp-2">{workflow.description}</p>
      <div>
        <span className="text-green-400 font-bold">
          ${workflow.priceUSDC.toFixed(4)} USDC
        </span>{" "}
        <span className="text-gray-600 text-xs">per call</span>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Reputation</span>
          <span>{workflow.reputationScore}/100</span>
        </div>
        <div className="bg-gray-800 rounded-full h-1.5">
          <div
            className={`${repColor} h-1.5 rounded-full`}
            style={{ width: `${workflow.reputationScore}%` }}
          />
        </div>
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{workflow.totalInvocations} invocations</span>
        <span>
          {workflow.owner.slice(0, 6)}...{workflow.owner.slice(-4)}
        </span>
      </div>
      <Link
        href={`/agent?workflowId=${workflow.id}`}
        className="bg-blue-700 hover:bg-blue-600 py-2 rounded-lg text-center mt-auto text-sm"
      >
        Use in Agent Task →
      </Link>
    </div>
  );
}
