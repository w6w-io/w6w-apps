import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId, stripSecrets } from "../lib/client.ts";
import { clientIdParam } from "../lib/params.ts";

/**
 * `GET /api/v3.3/clients/{clientid}.json` — a client's full details.
 * **Client-level.**
 *
 * ## The response carries a live secret, and this action deletes it
 *
 * Campaign Monitor documents this endpoint as returning "the complete details
 * for a client **including their API key**", and its published example response
 * opens with `"ApiKey": "639d8cc27198202f5fe6037a8b17a29a59984b86d3289bc9"`.
 * That value is a working client-scoped credential — exactly what
 * `auth/api-key.ts` accepts.
 *
 * A workflow step's result is persisted in the run record and routinely echoed
 * into logs, other apps and human-readable previews, so returning it would turn
 * one ordinary read into a durable leak. `stripSecrets` deletes the field rather
 * than masking it: a masked placeholder in a field named `ApiKey` reads like a
 * value and something downstream will try to use it. The value stays available
 * to its owner in the Campaign Monitor UI.
 *
 * This is also why this endpoint can never be the health probe — see
 * `auth/api-key.ts#WHY_NOT_CLIENT_DETAILS`.
 *
 * ## Two shape surprises in what is left
 *
 *  - `EmailAddress`, `ContactName` and `AccessDetails` appear **only when the
 *    client has exactly one Person**. With none, or with several, the vendor
 *    omits them entirely — so a workflow reading `BasicDetails.PrimaryContactEmail`
 *    must tolerate its absence.
 *  - `MonthlyScheme` appears only on monthly plans, and it **renames the plan**:
 *    the vendor states it "will always return the plan names of Basic, Unlimited
 *    and Premier i.e. for the Basic or Lite plans it returns Basic, and for the
 *    Unlimited or Essentials plans it returns Unlimited".
 */
interface Input {
  clientId: string;
}

const clientGet: ActionDefinition<Input, Record<string, unknown>> = {
  key: "client-get",
  type: "read",
  resource: "client",
  title: "Get Client",
  description:
    "Read a client's basic and billing details. The client's own secret field is deleted from " +
    "the response before it is returned.",
  params: [clientIdParam],
  output: [
    { key: "BasicDetails", type: "object", label: "Company name, country, timezone, contact" },
    { key: "BillingDetails", type: "object", label: "Credits, currency, markups, who pays" },
  ],

  async execute(input, ctx) {
    const client = await new CampaignMonitorClient(ctx).json<Record<string, unknown>>(
      `/clients/${encodeId(input.clientId)}`,
    );
    return stripSecrets(client);
  },
};

export default clientGet;
