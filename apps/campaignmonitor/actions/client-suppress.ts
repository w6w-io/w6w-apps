import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { asJson, clientIdParam } from "../lib/params.ts";

/**
 * `POST /api/v3.3/clients/{clientid}/suppress.json` — add addresses to the
 * client-wide suppression list. **Client-level.**
 *
 * Body: `{"EmailAddresses": ["a@example.com", "b@example.com"]}`. The response
 * is a bare `200 OK` with no body.
 *
 * `idempotent: true`: suppressing an already-suppressed address leaves the same
 * end state, so a retry after a dropped connection is safe and cannot
 * double-suppress anything. The inverse action is `client-unsuppress`, one
 * address at a time.
 *
 * Effect worth understanding before wiring this into a workflow: suppression is
 * **client-wide**, not per-list. It silences the address across every list of
 * this client that uses the `AllClientLists` unsubscribe setting.
 */
interface Input {
  clientId: string;
  emailAddresses: unknown;
}

const clientSuppress: ActionDefinition<Input, { suppressed: number }> = {
  key: "client-suppress",
  type: "perform",
  resource: "client",
  title: "Suppress Email Addresses",
  description:
    "Add one or more email addresses to the client-wide suppression list, silencing them across " +
    "every list that uses the AllClientLists unsubscribe setting.",
  idempotent: true,
  params: [
    clientIdParam,
    {
      key: "emailAddresses",
      label: "Email addresses",
      type: "json",
      required: true,
      hint: 'A JSON array of addresses, e.g. ["a@example.com", "b@example.com"].',
    },
  ],
  output: [{ key: "suppressed", type: "number", label: "Addresses submitted" }],

  async execute(input, ctx) {
    const addresses = asJson<string[]>(input.emailAddresses, "Email addresses");
    if (!Array.isArray(addresses) || addresses.length === 0) {
      throw new Error("Email addresses must be a non-empty JSON array");
    }
    await new CampaignMonitorClient(ctx).json(
      `/clients/${encodeId(input.clientId)}/suppress`,
      { method: "POST", body: { EmailAddresses: addresses } },
    );
    // The endpoint answers a bare 200 with no body, so the count is the only
    // fact there is to report.
    return { suppressed: addresses.length };
  },
};

export default clientSuppress;
