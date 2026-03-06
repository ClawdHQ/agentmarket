import {
  handler,
  HTTPClient,
  ConfidentialHTTPClient,
  EVMClient,
  HTTPCapability,
  Runner,
  encodeCallMsg,
  LATEST_BLOCK_NUMBER,
  consensusIdenticalAggregation,
  type Runtime,
  type HTTPSendRequester,
  json,
  bytesToHex,
  hexToBase64,
  ok
} from "@chainlink/cre-sdk";
import { z } from "zod";
import { encodeFunctionData, decodeFunctionResult, zeroAddress, type Address } from "viem";

const inputSchema = z.object({
  task: z.string().min(5),
  agentAddress: z.string().startsWith("0x"),
  maxBudgetUSDC: z.number().positive(),
});

interface Selection {
  selectedId: string;
}

interface Payment {
  txHash: string;
}

const REGISTRY_ABI = [
  {
    name: "listActive",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "tuple[]",
        components: [
          { name: "id", type: "bytes32" },
          { name: "name", type: "string" },
          { name: "priceUSDC", type: "uint256" },
          { name: "endpoint", type: "string" },
        ],
      },
    ],
  },
] as const;

export const initOrchestrator = (config: any) => {
  const httpCap = new HTTPCapability();
  const trigger = httpCap.trigger({});

  const evmClient = new EVMClient(16015286601757825753n); // Sepolia selector
  const httpClient = new HTTPClient();
  const confHttpClient = new ConfidentialHTTPClient();

  return [
    handler(trigger, (runtime: Runtime<any>, triggerOutput: any) => {
      runtime.log("DEBUG: Production Orchestrator started");

      let bodyRaw = {};
      if (triggerOutput.input) {
        let inputStr = typeof triggerOutput.input === 'string'
          ? (triggerOutput.input as string)
          : new TextDecoder().decode(triggerOutput.input as Uint8Array);
        bodyRaw = JSON.parse(inputStr);
      }

      const input = inputSchema.parse(bodyRaw);
      const { task, agentAddress, maxBudgetUSDC } = input;

      const registryAddr = "0x5d019f68DCD9792afb242eec64074558fBd6b10B";
      const backendUrl = "http://127.0.0.1:3001";

      runtime.log(`DEBUG: Target Task: ${task} `);

      // 1. Discover via On-chain Registry (Strict)
      const callData = encodeFunctionData({ abi: REGISTRY_ABI, functionName: "listActive" });
      const callResult = evmClient.callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: registryAddr as Address, data: callData }),
        blockNumber: LATEST_BLOCK_NUMBER
      }).result();

      const returnedData = bytesToHex(callResult.data);
      if (!returnedData || returnedData === "0x") {
        throw new Error("CRITICAL: Workflow Registry on Sepolia returned empty data (0x). Ensure the contract is funded, deployed, and populated.");
      }

      const workflowsRaw = decodeFunctionResult({
        abi: REGISTRY_ABI,
        functionName: "listActive",
        data: returnedData
      }) as any[];

      runtime.log(`DEBUG: returnedData: ${returnedData}`);
      runtime.log(`DEBUG: workflowsRaw: ${typeof workflowsRaw} ${JSON.stringify(workflowsRaw, (_, v) => typeof v === 'bigint' ? v.toString() : v)}`);

      const filtered = workflowsRaw
        .map((w: any) => {
          // Handle both array and object returns from viem/ethers
          const id = w.id || w[0];
          const name = w.name || w[1];
          const priceUSDC = w.priceUSDC !== undefined ? w.priceUSDC : w[2];
          const endpoint = w.endpoint || w[3];
          return { id, name, priceUSDC: Number(priceUSDC) / 1e6, endpoint };
        })
        .filter((w: any) => w.priceUSDC <= maxBudgetUSDC);

      if (filtered.length === 0) throw new Error("No affordable workflows found in the Sepolia Registry.");
      runtime.log(`DEBUG: Found ${filtered.length} applicable workflows.`);

      // 2. Selection (Using direct Runtime call for ConfidentialHTTP)
      // Extract OpenRouter API Key from CRE secret store
      let openRouterApiKey: string;
      try {
        const secret = runtime.getSecret({ id: "OPENROUTER_API_KEY" }).result();
        openRouterApiKey = secret.value;
      } catch {
        throw new Error("Missing OPENROUTER_API_KEY in CRE secrets.");
      }
      if (!openRouterApiKey || openRouterApiKey === "") {
        throw new Error("CRITICAL: OPENROUTER_API_KEY secret is missing or empty.");
      }

      const resp = runtime.runInNodeMode(
        (nodeRuntime) => {
          const httpClient = new HTTPClient();
          const r = httpClient.sendRequest(nodeRuntime, {
            url: "https://openrouter.ai/api/v1/chat/completions",
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openRouterApiKey}`,
              "Content-Type": "application/json"
            },
            body: hexToBase64(bytesToHex(new TextEncoder().encode(JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                { role: "system", content: "You are an agent orchestrator. Select the best service ID based on the task and available services. Return only a JSON object like: { \"selectedId\": \"...\" }" },
                { role: "user", content: `Task: ${task}\nServices: ${JSON.stringify(filtered)}` }
              ]
            }))))
          }).result();
          if (!ok(r)) {
            throw new Error(`CRITICAL: OpenRouter Inference Failed. Status Code: ${r.statusCode}`);
          }
          return r;
        },
        consensusIdenticalAggregation<any>()
      )().result();

      let parsedAiResult;
      try {
        parsedAiResult = json(resp);
      } catch (e: any) {
        throw new Error(`CRITICAL: JSON parse failed. ${e.message}`);
      }

      const stringResp = (parsedAiResult as any)?.choices?.[0]?.message?.content || "";
      const selectedIdMatch = stringResp.match(/"selectedId"\s*:\s*"([^"]+)"/);
      if (!selectedIdMatch || !selectedIdMatch[1]) {
        throw new Error(`CRITICAL: OpenRouter did not return a valid selectedId. Got: ${stringResp}`);
      }
      const selectedId = selectedIdMatch[1];
      const selected = filtered.find((w: any) => w.id === selectedId) || filtered[0];
      runtime.log(`DEBUG: Selected Workflow: ${selected.id} at ${selected.endpoint} `);

      // 3. Initiate Payment (Strict HTTP execution)
      const paymentResult = httpClient.sendRequest(
        runtime,
        (requester: HTTPSendRequester, pBackendUrl: string, pWorkflowId: string, pAgentAddr: string) => {
          const r = requester.sendRequest({
            method: "POST",
            url: `${pBackendUrl}/api/x402/initiate`,
            headers: { "Content-Type": "application/json" },
            body: hexToBase64(bytesToHex(new TextEncoder().encode(JSON.stringify({ workflowId: pWorkflowId, agentAddress: pAgentAddr }))))
          }).result();
          if (!ok(r)) throw new Error(`Status ${r.statusCode} from Payment Gateway`);
          return (json(r) as any) as Payment;
        },
        consensusIdenticalAggregation<Payment>()
      )(backendUrl, selected.id, agentAddress).result();
      const paymentTxHash = paymentResult.txHash;

      runtime.log(`DEBUG: Payment completed.Receipt: ${paymentTxHash} `);

      // 4. Invoke Service (Strict HTTP execution)
      const serviceResult = httpClient.sendRequest(
        runtime,
        (requester: HTTPSendRequester, pEndpoint: string, pTask: string, pPayment: Payment) => {
          const r = requester.sendRequest({
            method: "POST",
            url: pEndpoint,
            headers: {
              "Content-Type": "application/json",
              "X-Payment-Receipt": pPayment.txHash
            },
            body: hexToBase64(bytesToHex(new TextEncoder().encode(JSON.stringify({ task: pTask }))))
          }).result();
          if (!ok(r)) throw new Error(`Status ${r.statusCode} from Service Endpoint`);
          return json(r) as object;
        },
        consensusIdenticalAggregation<object>()
      )(selected.endpoint, task, paymentResult).result();
      const finalServiceResult = serviceResult as any;

      runtime.log("DEBUG: Service invoked successfully");

      return {
        success: true,
        workflow: selected.id,
        payment: paymentTxHash,
        result: finalServiceResult
      };
    })
  ];
};

export async function main() {
  const runner = await Runner.newRunner();
  await runner.run(initOrchestrator);
}
