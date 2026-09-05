import type { ActionDefinition } from "@w6w/types";
import { type BrowserClient, type BrowserOnlineListResponse, ManusClient } from "../lib/client.ts";

/**
 * `GET /v2/browser.onlineList` — the user's online browser clients (Manus's
 * browser extension). Use a returned `client_id` with `task-confirm-action`
 * when a task raises a `needConnectMyBrowser` waiting event, handing control
 * of that browser session to the task.
 */
const browserOnlineList: ActionDefinition<Record<string, never>, BrowserClient[]> = {
  key: "browser-online-list",
  type: "read",
  resource: "browser",
  title: "List Online Browser Clients",
  description: "List the account's currently-online browser clients.",
  params: [],
  output: [{ key: "", type: "array", label: "Online browser clients" }],

  async execute(_input, ctx) {
    const res = await new ManusClient(ctx).request<BrowserOnlineListResponse>(
      "/v2/browser.onlineList",
    );
    return res.data;
  },
};

export default browserOnlineList;
