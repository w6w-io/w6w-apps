import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { clientIdParam, emailParam } from "../lib/params.ts";

/**
 * `PUT /api/v3.3/clients/{clientid}/unsuppress.json?email={email}` — remove one
 * address from the client-wide suppression list. **Client-level.**
 *
 * Note the verb: **PUT**, not DELETE, and the address travels in the query
 * string rather than a body. The response is a bare `200 OK`.
 *
 * `idempotent: true` — removing an address that is already absent leaves the
 * same end state and cannot cause harm. It is not *silent*, though: the vendor
 * answers a second call with `400 {"Code":176,"Message":"Email address not in
 * suppression list"}`, so a retry after a *successful but unacknowledged* first
 * call surfaces that code rather than a second success. The client reports it
 * verbatim.
 */
interface Input {
  clientId: string;
  email: string;
}

const clientUnsuppress: ActionDefinition<Input, { email: string }> = {
  key: "client-unsuppress",
  type: "perform",
  resource: "client",
  title: "Unsuppress Email Address",
  description:
    "Remove one email address from the client-wide suppression list. Answers code 176 if the " +
    "address was not on it.",
  idempotent: true,
  params: [clientIdParam, { ...emailParam, label: "Email address to unsuppress" }],
  output: [{ key: "email", type: "string", label: "Address that was unsuppressed" }],

  async execute(input, ctx) {
    await new CampaignMonitorClient(ctx).json(
      `/clients/${encodeId(input.clientId)}/unsuppress`,
      { method: "PUT", query: { email: input.email } },
    );
    return { email: input.email };
  },
};

export default clientUnsuppress;
