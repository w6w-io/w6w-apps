import type { ActionDefinition } from "@w6w/types";
import { AirtopClient, compact } from "../lib/client.ts";
import { sessionIdParam, windowIdParam, windowOutput } from "../lib/params.ts";

/** `GET /v1/sessions/{sessionId}/windows/{windowId}` — window info, including the live view URL. */
interface Input {
  sessionId: string;
  windowId: string;
  includeNavigationBar?: boolean;
  disableResize?: boolean;
  screenResolution?: string;
}

const windowGet: ActionDefinition<Input> = {
  key: "window-get",
  type: "read",
  resource: "window",
  title: "Get Window",
  description: "Get a browser window's current info, including a live view URL.",
  params: [
    sessionIdParam,
    windowIdParam,
    {
      key: "includeNavigationBar",
      label: "Show navigation bar in live view",
      type: "boolean",
      advanced: true,
    },
    {
      key: "disableResize",
      label: "Disable resizing from live view",
      type: "boolean",
      advanced: true,
    },
    {
      key: "screenResolution",
      label: "Live view resolution",
      type: "string",
      placeholder: "1280x720",
      advanced: true,
      hint: "Fixed size for the returned live view URL, e.g. 1280x720. Leave empty to fill the " +
        "parent frame.",
    },
  ],
  output: windowOutput,

  execute(input, ctx) {
    return new AirtopClient(ctx).data(
      `/v1/sessions/${encodeURIComponent(input.sessionId)}/windows/${
        encodeURIComponent(input.windowId)
      }`,
      {
        query: compact({
          includeNavigationBar: input.includeNavigationBar,
          disableResize: input.disableResize,
          screenResolution: input.screenResolution,
        }),
      },
    );
  },
};

export default windowGet;
