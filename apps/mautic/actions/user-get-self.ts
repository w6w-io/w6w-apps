import type { ActionDefinition } from "@w6w/types";
import { MauticClient } from "../lib/client.ts";

/**
 * `GET /users/self` — verified against Mautic's REST API docs (`users.html`,
 * "Get current User"). Returns the profile of the user the API Credential was
 * minted for — the same call this app's auth `test` and `afterConnect` hooks
 * use, exposed as its own read so a workflow can branch on who a connection
 * runs as.
 */
const action: ActionDefinition = {
  key: "user-get-self",
  type: "read",
  resource: "user",
  title: "Get the connected user",
  description: "Get the profile of the user this connection runs as.",
  params: [],

  async execute(_input, ctx) {
    ctx.log("info", "getting the connected Mautic user");
    return await new MauticClient(ctx).request("/users/self");
  },
};

export default action;
