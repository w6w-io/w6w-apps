import type { ActionDefinition } from "@w6w/types";
import { AirtopClient, compact } from "../lib/client.ts";
import {
  aiInteractionBody,
  aiInteractionParams,
  aiOutput,
  sessionIdParam,
  windowIdParam,
} from "../lib/params.ts";

/**
 * `POST /v1/sessions/{sessionId}/windows/{windowId}/page-query`
 *
 * Ask a natural-language question about the page's content.
 *
 * `outputSchema` is a **string** holding a serialized JSON Schema document
 * (`{"type":"object","properties":{...}}` as text), NOT an object — confirmed
 * from the OpenAPI document's own `type: "string"` on that field. Without
 * this, the response format "might vary" per the vendor's own wording.
 */
interface Input {
  sessionId: string;
  windowId: string;
  prompt: string;
  followPaginationLinks?: boolean;
  outputSchema?: string;
  actionId?: string;
  costThresholdCredits?: number;
  timeThresholdSeconds?: number;
  clientRequestId?: string;
}

const windowPageQuery: ActionDefinition<Input> = {
  key: "window-page-query",
  type: "read",
  resource: "window-interaction",
  title: "Page Query",
  description: "Ask a natural-language question about the page's content.",
  params: [
    sessionIdParam,
    windowIdParam,
    { key: "prompt", label: "Prompt", type: "text", required: true },
    {
      key: "followPaginationLinks",
      label: "Follow pagination links",
      type: "boolean",
      hint: "Best-effort attempt to load more content than is initially shown (pagination links, " +
        "'load more' buttons, infinite scroll). Costlier — constrain it in your prompt.",
    },
    {
      key: "outputSchema",
      label: "Output schema (JSON Schema, as text)",
      type: "code",
      advanced: true,
      hint: "A JSON Schema document, as a string. Without it, the response shape may vary.",
    },
    {
      key: "actionId",
      label: "Action ID",
      type: "string",
      advanced: true,
      hint: "Stable cache key to reuse cached results for repeated queries.",
    },
    ...aiInteractionParams(),
  ],
  output: aiOutput(),

  async execute(input, ctx) {
    const config = compact({ outputSchema: input.outputSchema });
    const result = await new AirtopClient(ctx).aiRequest(
      `/v1/sessions/${encodeURIComponent(input.sessionId)}/windows/${
        encodeURIComponent(input.windowId)
      }/page-query`,
      {
        method: "POST",
        body: {
          prompt: input.prompt,
          followPaginationLinks: input.followPaginationLinks,
          actionId: input.actionId,
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

export default windowPageQuery;
