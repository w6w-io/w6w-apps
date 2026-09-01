import type { ActionDefinition } from "@w6w/types";
import { AirtopClient } from "../lib/client.ts";
import {
  aiInteractionBody,
  aiInteractionParams,
  aiOutput,
  sessionIdParam,
  windowIdParam,
} from "../lib/params.ts";

/**
 * `POST /v1/sessions/{sessionId}/windows/{windowId}/type` — AI-located typing.
 *
 * `elementDescription` is optional — only `text` is required. Leaving it empty
 * types into whichever element is already focused.
 */
interface Input {
  sessionId: string;
  windowId: string;
  text: string;
  elementDescription?: string;
  clearInputField?: boolean;
  pressEnterKey?: boolean;
  pressTabKey?: boolean;
  actionId?: string;
  costThresholdCredits?: number;
  timeThresholdSeconds?: number;
  clientRequestId?: string;
}

const windowType: ActionDefinition<Input> = {
  key: "window-type",
  type: "perform",
  resource: "window-interaction",
  title: "Type",
  description: "Type text into an element, optionally located by a natural-language description.",
  idempotent: false,
  params: [
    sessionIdParam,
    windowIdParam,
    { key: "text", label: "Text", type: "text", required: true },
    {
      key: "elementDescription",
      label: "Element description",
      type: "string",
      hint: "Natural language, e.g. 'The search box input'. Leave empty to type into whatever is " +
        "already focused.",
    },
    { key: "clearInputField", label: "Clear field first", type: "boolean" },
    { key: "pressEnterKey", label: "Press Enter after typing", type: "boolean" },
    {
      key: "pressTabKey",
      label: "Press Tab after typing",
      type: "boolean",
      hint: "If both are set, Enter is pressed before Tab.",
    },
    {
      key: "actionId",
      label: "Action ID",
      type: "string",
      advanced: true,
      hint: "Stable cache key (e.g. a UUID) to reuse cached element metadata for repeated typing.",
    },
    ...aiInteractionParams(),
  ],
  output: aiOutput(),

  async execute(input, ctx) {
    const result = await new AirtopClient(ctx).aiRequest(
      `/v1/sessions/${encodeURIComponent(input.sessionId)}/windows/${
        encodeURIComponent(input.windowId)
      }/type`,
      {
        method: "POST",
        body: {
          text: input.text,
          elementDescription: input.elementDescription,
          clearInputField: input.clearInputField,
          pressEnterKey: input.pressEnterKey,
          pressTabKey: input.pressTabKey,
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

export default windowType;
