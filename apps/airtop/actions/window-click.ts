import type { ActionDefinition } from "@w6w/types";
import { AirtopClient, compact } from "../lib/client.ts";
import {
  aiInteractionBody,
  aiInteractionParams,
  aiOutput,
  sessionIdParam,
  windowIdParam,
} from "../lib/params.ts";

const clickTypeOptions = [
  { value: "click", label: "Left click (default)" },
  { value: "doubleClick", label: "Double click" },
  { value: "rightClick", label: "Right click" },
];

const desiredStateOptions = [
  "checked",
  "unchecked",
  "expanded",
  "collapsed",
  "selected",
  "unselected",
  "pressed",
  "unpressed",
  "on",
  "off",
].map((v) => ({ value: v, label: v }));

/**
 * `POST /v1/sessions/{sessionId}/windows/{windowId}/click` — AI-located click.
 *
 * `elementDescription` is natural language ("The login button"), not a CSS
 * selector — Airtop's model locates the element itself, which is what keeps
 * this working across a site's markup changes.
 */
interface Input {
  sessionId: string;
  windowId: string;
  elementDescription: string;
  clickType?: string;
  desiredState?: string;
  waitForNavigation?: boolean;
  actionId?: string;
  costThresholdCredits?: number;
  timeThresholdSeconds?: number;
  clientRequestId?: string;
}

const windowClick: ActionDefinition<Input> = {
  key: "window-click",
  type: "perform",
  resource: "window-interaction",
  title: "Click",
  description: "Click an element on the page, located by a natural-language description.",
  idempotent: false,
  params: [
    sessionIdParam,
    windowIdParam,
    {
      key: "elementDescription",
      label: "Element description",
      type: "string",
      required: true,
      hint: "Natural language, e.g. 'The login button'.",
    },
    { key: "clickType", label: "Click type", type: "select", options: clickTypeOptions },
    {
      key: "desiredState",
      label: "Desired state",
      type: "select",
      options: desiredStateOptions,
      advanced: true,
      hint: "For binary-state elements (checkbox, toggle, accordion). Skips the click if already " +
        "in this state.",
    },
    {
      key: "waitForNavigation",
      label: "Wait for navigation",
      type: "boolean",
      hint: "Wait for the resulting page navigation to finish before returning.",
    },
    {
      key: "actionId",
      label: "Action ID",
      type: "string",
      advanced: true,
      hint: "Stable cache key (e.g. a UUID) to reuse cached element metadata for repeated clicks.",
    },
    ...aiInteractionParams(),
  ],
  output: aiOutput(),

  async execute(input, ctx) {
    const result = await new AirtopClient(ctx).aiRequest(
      `/v1/sessions/${encodeURIComponent(input.sessionId)}/windows/${
        encodeURIComponent(input.windowId)
      }/click`,
      {
        method: "POST",
        body: {
          elementDescription: input.elementDescription,
          waitForNavigation: input.waitForNavigation,
          actionId: input.actionId,
          configuration: compact({ clickType: input.clickType, desiredState: input.desiredState }),
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

export default windowClick;
