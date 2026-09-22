import type { ActionDefinition } from "@w6w/types";
import { DeputyClient } from "../lib/client.ts";

/**
 * `GET /api/v1/me` — Deputy's "Who Am I" endpoint.
 *
 * Deputy's own authentication pages name this call as the way to validate a
 * token: *"An easy way to do this is to make an API request to the Who am i
 * endpoint which will return information about the owner of the access token …
 * GET https://{deputyinstall}.{geo}.deputy.com/api/v1/me"* (both "Using a
 * Permanent Token" and "Using Oauth 2.0", read 2026-09-22).
 *
 * **The response shape is undocumented.** The dedicated reference page for this
 * endpoint now redirects to the getting-started guide, so nothing on
 * `developer.deputy.com` states what the 200 body contains beyond "information
 * about the owner of the access token", and it could not be captured without a
 * live credential. The body is therefore returned under `response` as Deputy's
 * own object rather than projected into fields this app would be guessing at —
 * and it is worth knowing that `GET /api/v1/my/setup` ("Where can I work / What
 * do I do") is a *different*, also hand-documented endpoint that answers the
 * related "what am I allowed to touch" question.
 */
const action: ActionDefinition = {
  key: "me",
  type: "read",
  resource: "me",
  title: "Who am I",
  description: "Get the Deputy user this connection's permanent token belongs to.",
  params: [],
  output: [
    { key: "response", type: "object", label: "Deputy's own body — shape undocumented" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "asking Deputy who this token belongs to");
    return { response: await new DeputyClient(ctx).me() };
  },
};

export default action;
