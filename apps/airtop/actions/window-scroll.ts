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
 * `POST /v1/sessions/{sessionId}/windows/{windowId}/scroll`
 *
 * Three mutually exclusive ways to scroll, in the vendor's own priority order:
 * `scrollToElement` (natural language) wins over `scrollToEdge`, which wins
 * over `scrollBy`. None are required — all three may be left empty.
 */
interface Input {
  sessionId: string;
  windowId: string;
  scrollToElement?: string;
  scrollToEdgeX?: string;
  scrollToEdgeY?: string;
  scrollByX?: string;
  scrollByY?: string;
  actionId?: string;
  costThresholdCredits?: number;
  timeThresholdSeconds?: number;
  clientRequestId?: string;
}

const windowScroll: ActionDefinition<Input> = {
  key: "window-scroll",
  type: "perform",
  resource: "window-interaction",
  title: "Scroll",
  description: "Scroll the page — to an element, to an edge, or by a relative amount.",
  idempotent: false,
  params: [
    sessionIdParam,
    windowIdParam,
    {
      key: "scrollToElement",
      label: "Scroll to element",
      type: "string",
      hint:
        "Natural language description, e.g. 'the footer'. Takes priority over the fields below.",
    },
    {
      key: "scrollToEdgeX",
      label: "Scroll to edge — horizontal",
      type: "select",
      options: [{ value: "left", label: "Left" }, { value: "right", label: "Right" }],
      advanced: true,
    },
    {
      key: "scrollToEdgeY",
      label: "Scroll to edge — vertical",
      type: "select",
      options: [{ value: "top", label: "Top" }, { value: "bottom", label: "Bottom" }],
      advanced: true,
    },
    {
      key: "scrollByX",
      label: "Scroll by — horizontal",
      type: "string",
      placeholder: "10px or 10%",
      advanced: true,
      hint: "Positive scrolls right, negative scrolls left.",
    },
    {
      key: "scrollByY",
      label: "Scroll by — vertical",
      type: "string",
      placeholder: "10px or 10%",
      advanced: true,
      hint: "Positive scrolls down, negative scrolls up.",
    },
    {
      key: "actionId",
      label: "Action ID",
      type: "string",
      advanced: true,
      hint: "Stable cache key, used only when scrolling to an element.",
    },
    ...aiInteractionParams(),
  ],
  output: aiOutput(),

  async execute(input, ctx) {
    const scrollToEdge = compact({ xAxis: input.scrollToEdgeX, yAxis: input.scrollToEdgeY });
    const scrollBy = compact({ xAxis: input.scrollByX, yAxis: input.scrollByY });
    const result = await new AirtopClient(ctx).aiRequest(
      `/v1/sessions/${encodeURIComponent(input.sessionId)}/windows/${
        encodeURIComponent(input.windowId)
      }/scroll`,
      {
        method: "POST",
        body: {
          scrollToElement: input.scrollToElement,
          scrollToEdge: Object.keys(scrollToEdge).length ? scrollToEdge : undefined,
          scrollBy: Object.keys(scrollBy).length ? scrollBy : undefined,
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

export default windowScroll;
