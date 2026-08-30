import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/**
 * `GET /v1/call-summaries/{callId}` — the AI-generated summary of a call (regular or
 * Sona-handled). Only available on Quo's Business and Scale plans.
 */
interface Input {
  callId: string;
}

const callSummaryGet: ActionDefinition<Input> = {
  key: "call-summary-get",
  type: "read",
  resource: "call",
  title: "Get Call Summary",
  description: "Get the AI-generated summary of a call by its unique call ID. Only available " +
    "on Business and Scale plans; supports both regular calls and calls handled by Sona.",
  params: [
    {
      key: "callId",
      label: "Call ID",
      type: "string",
      required: true,
      hint: "The unique identifier of the call.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Summary (callId, status, summary, nextSteps, jobs)" },
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json(`/call-summaries/${encodeURIComponent(input.callId)}`);
  },
};

export default callSummaryGet;
