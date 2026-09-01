import type { ActionDefinition } from "@w6w/types";
import { AirtopClient, compact } from "../lib/client.ts";
import {
  aiInteractionBody,
  aiInteractionParams,
  aiOutput,
  sessionIdParam,
  windowIdParam,
} from "../lib/params.ts";

/** `POST /v1/sessions/{sessionId}/windows/{windowId}/summarize-content` */
interface Input {
  sessionId: string;
  windowId: string;
  prompt?: string;
  outputSchema?: string;
  costThresholdCredits?: number;
  timeThresholdSeconds?: number;
  clientRequestId?: string;
}

const windowSummarizeContent: ActionDefinition<Input> = {
  key: "window-summarize-content",
  type: "read",
  resource: "window-interaction",
  title: "Summarize Content",
  description: "Summarize the page's content.",
  params: [
    sessionIdParam,
    windowIdParam,
    {
      key: "prompt",
      label: "Prompt",
      type: "text",
      hint: "Optional additional direction or constraints, e.g. desired length.",
    },
    {
      key: "outputSchema",
      label: "Output schema (JSON Schema, as text)",
      type: "code",
      advanced: true,
      hint: "A JSON Schema document, as a string. Without it, the response shape may vary.",
    },
    ...aiInteractionParams(),
  ],
  output: aiOutput(),

  async execute(input, ctx) {
    const config = compact({ outputSchema: input.outputSchema });
    const result = await new AirtopClient(ctx).aiRequest(
      `/v1/sessions/${encodeURIComponent(input.sessionId)}/windows/${
        encodeURIComponent(input.windowId)
      }/summarize-content`,
      {
        method: "POST",
        body: {
          prompt: input.prompt,
          configuration: Object.keys(config).length ? config : undefined,
          ...aiInteractionBody(input),
        },
      },
    );
    return {
      modelResponse: result.modelResponse,
      status: result.meta.status,
      credits: result.meta.usage?.credits,
      requestId: result.meta.requestId,
    };
  },
};

export default windowSummarizeContent;
