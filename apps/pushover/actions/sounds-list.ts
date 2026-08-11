import type { ActionDefinition } from "@w6w/types";
import { PushoverClient } from "../lib/client.ts";

/**
 * `GET /1/sounds.json` — the sounds this application can specify.
 *
 * The built-in list is fixed and is offered as a dropdown on `message-send`, so
 * the reason to call this is **custom sounds**: since April 2021 an account can
 * upload its own, and an application can play one for every recipient it sends
 * to. Those names only exist here.
 *
 * Application-scoped — it takes the application token and no user key, which is
 * why `auth/app-token.ts` deliberately withholds the recipient's key from it.
 */
const soundsList: ActionDefinition<Record<string, never>> = {
  key: "sounds-list",
  type: "search",
  resource: "sound",
  title: "List Sounds",
  description:
    "List the notification sounds available to this application, including any custom sounds " +
    "uploaded to the account that owns it.",
  params: [],
  output: [
    { key: "sounds", type: "object", label: "Sound name → human label" },
    { key: "status", type: "number", label: "`1` on success" },
  ],

  execute(_input, ctx) {
    return new PushoverClient(ctx).request("/1/sounds.json", { method: "GET" });
  },
};

export default soundsList;
