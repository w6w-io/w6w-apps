import type { ActionDefinition } from "@w6w/types";
import { AirtopClient } from "../lib/client.ts";
import {
  aiInteractionBody,
  aiInteractionParams,
  aiOutput,
  sessionIdParam,
  windowIdParam,
} from "../lib/params.ts";

/** `POST /v1/sessions/{sessionId}/windows/{windowId}/hover` — AI-located hover. */
interface Input {
  sessionId: string;
  windowId: string;
  elementDescription: string;
  actionId?: string;
  costThresholdCredits?: number;
  timeThresholdSeconds?: number;
  clientRequestId?: string;
}

const windowHover: ActionDefinition<Input> = {
  key: "window-hover",
  type: "perform",
  resource: "window-interaction",
  title: "Hover",
  description: "Hover over an element on the page, located by a natural-language description.",
  idempotent: false,
  params: [
    sessionIdParam,
    windowIdParam,
    {
      key: "elementDescription",
      label: "Element description",
      type: "string",
      required: true,
      hint: "Natural language, e.g. 'The search box input in the top right corner'.",
    },
    {
      key: "actionId",
      label: "Action ID",
      type: "string",
      advanced: true,
      hint: "Stable cache key (e.g. a UUID) to reuse cached element metadata for repeated hovers.",
    },
    ...aiInteractionParams(),
  ],
  output: aiOutput(),

  async execute(input, ctx) {
    const result = await new AirtopClient(ctx).aiRequest(
      `/v1/sessions/${encodeURIComponent(input.sessionId)}/windows/${
        encodeURIComponent(input.windowId)
      }/hover`,
      {
        method: "POST",
        body: {
          elementDescription: input.elementDescription,
          actionId: input.actionId,
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

export default windowHover;
