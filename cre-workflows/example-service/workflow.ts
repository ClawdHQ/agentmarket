import {
  handler,
  HTTPCapability,
  ConfidentialHTTPClient,
  Runner,
  type Runtime,
  json,
  bytesToHex,
  hexToBase64,
  ok
} from "@chainlink/cre-sdk";
import { z } from "zod";

const inputSchema = z.object({
  task: z.string().min(5),
});

interface Research {
  summary: string;
}

export const initService = (config: any) => {
  const httpCap = new HTTPCapability();
  const trigger = httpCap.trigger({});

  const confHttpClient = new ConfidentialHTTPClient();

  return [
    handler(trigger, (runtime: Runtime<any>, triggerOutput: any) => {
      runtime.log("DEBUG: Service started");

      let bodyRaw = {};
      if (triggerOutput.input) {
        let inputStr = typeof triggerOutput.input === 'string'
          ? (triggerOutput.input as string)
          : new TextDecoder().decode(triggerOutput.input as Uint8Array);
        bodyRaw = JSON.parse(inputStr);
      }

      const input = inputSchema.parse(bodyRaw);
      const { task } = input;

      let receipt = "";
      if (triggerOutput.headers && (triggerOutput.headers as any)["x-payment-receipt"]) {
        receipt = (triggerOutput.headers as any)["x-payment-receipt"];
      }

      runtime.log(`DEBUG: Service task: ${task}. Receipt provided: ${receipt ? 'yes' : 'no'}`);

      // Perform Research
      let openRouterApiKey: string;
      try {
        const secret = runtime.getSecret({ id: "OPENROUTER_API_KEY" }).result();
        openRouterApiKey = secret.value;
      } catch {
        throw new Error("Missing OPENROUTER_API_KEY in CRE secrets.");
      }

      const resp = confHttpClient.sendRequest(runtime, {
        request: {
          method: "POST",
          url: "https://openrouter.ai/api/v1/chat/completions",
          multiHeaders: { "Authorization": { values: [`Bearer ${openRouterApiKey}`] } },
          bodyString: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [{ role: "user", content: `Researcher. Task: ${task}. JSON result: { "summary": "string" }` }]
          })
        }
      }).result();

      if (!ok(resp)) {
        throw new Error(`CRITICAL: OpenRouter Inference Failed. Status Code: ${resp.statusCode}. Response: ${String(resp.body)}`);
      }

      let parsedAiResult: Research;
      try {
        let text = (json(resp) as any).choices[0].message.content.trim();
        const fm = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fm) text = fm[1].trim();
        else {
          const bs = text.indexOf("{");
          const be = text.lastIndexOf("}");
          if (bs !== -1 && be !== -1) text = text.slice(bs, be + 1).trim();
        }
        parsedAiResult = JSON.parse(text) as Research;
      } catch (e: any) {
        runtime.log(`ERROR: AI parsing failed. Content: ${String((json(resp) as any).choices[0].message.content)}`);
        parsedAiResult = { summary: "AI generation successful but result format was non-standard." };
      }

      runtime.log(`DEBUG: Research completed: ${parsedAiResult.summary.substring(0, 50)}...`);

      return {
        success: true,
        answer: parsedAiResult.summary,
        receipt
      };
    })
  ];
};

export async function main() {
  const runner = await Runner.newRunner();
  await runner.run(initService);
}
