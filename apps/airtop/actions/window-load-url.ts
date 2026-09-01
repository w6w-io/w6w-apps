import type { ActionDefinition } from "@w6w/types";
import { AirtopClient } from "../lib/client.ts";
import {
  sessionIdParam,
  waitUntilOptions,
  waitUntilTimeoutSecondsParam,
  windowIdParam,
} from "../lib/params.ts";

/** `POST /v1/sessions/{sessionId}/windows/{windowId}` — "Load url": navigate an existing window. */
interface Input {
  sessionId: string;
  windowId: string;
  url: string;
  waitUntil?: string;
  waitUntilTimeoutSeconds?: number;
}

const windowLoadUrl: ActionDefinition<Input> = {
  key: "window-load-url",
  type: "perform",
  resource: "window",
  title: "Load URL",
  description: "Navigate an existing browser window to a URL.",
  idempotent: false,
  params: [
    sessionIdParam,
    windowIdParam,
    { key: "url", label: "URL", type: "string", required: true },
    {
      key: "waitUntil",
      label: "Wait until",
      type: "select",
      options: waitUntilOptions,
      advanced: true,
    },
    { ...waitUntilTimeoutSecondsParam, advanced: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  async execute(input, ctx) {
    ctx.log("info", "loading URL", { sessionId: input.sessionId, windowId: input.windowId });
    const result = await new AirtopClient(ctx).data<{ success?: boolean }>(
      `/v1/sessions/${encodeURIComponent(input.sessionId)}/windows/${
        encodeURIComponent(input.windowId)
      }`,
      {
        method: "POST",
        body: {
          url: input.url,
          waitUntil: input.waitUntil,
          waitUntilTimeoutSeconds: input.waitUntilTimeoutSeconds,
        },
      },
    );
    return { success: result?.success ?? true };
  },
};

export default windowLoadUrl;
