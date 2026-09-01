import type { ActionDefinition } from "@w6w/types";
import { AirtopClient, compact } from "../lib/client.ts";
import {
  createWindowOutput,
  sessionIdParam,
  waitUntilOptions,
  waitUntilTimeoutSecondsParam,
} from "../lib/params.ts";

/** `POST /v1/sessions/{sessionId}/windows` — open a new browser window (tab) in a session. */
interface Input {
  sessionId: string;
  url?: string;
  waitUntil?: string;
  waitUntilTimeoutSeconds?: number;
  screenResolution?: string;
}

const windowCreate: ActionDefinition<Input> = {
  key: "window-create",
  type: "perform",
  resource: "window",
  title: "Create Window",
  description: "Open a new browser window in a session, optionally loading a URL.",
  idempotent: false,
  params: [
    sessionIdParam,
    {
      key: "url",
      label: "Initial URL",
      type: "string",
      hint: "URL to navigate to on creation. Airtop's own default, if left empty, is a search " +
        "engine home page.",
    },
    {
      key: "waitUntil",
      label: "Wait until",
      type: "select",
      options: waitUntilOptions,
      advanced: true,
    },
    { ...waitUntilTimeoutSecondsParam, advanced: true },
    {
      key: "screenResolution",
      label: "Live view resolution",
      type: "string",
      default: "1280x720",
      placeholder: "1280x720",
      advanced: true,
      hint: "Fixed size for the returned live view URL, e.g. 1280x720.",
    },
  ],
  output: createWindowOutput,

  execute(input, ctx) {
    ctx.log("info", "creating Airtop window", { sessionId: input.sessionId, url: input.url });
    return new AirtopClient(ctx).data(
      `/v1/sessions/${encodeURIComponent(input.sessionId)}/windows`,
      {
        method: "POST",
        body: compact({
          url: input.url,
          waitUntil: input.waitUntil,
          waitUntilTimeoutSeconds: input.waitUntilTimeoutSeconds,
          screenResolution: input.screenResolution,
        }),
      },
    );
  },
};

export default windowCreate;
