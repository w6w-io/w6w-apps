import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, type ApifyListPage, flag } from "../lib/client.ts";
import { descParam, paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/webhooks` — the webhooks this account has created.
 *
 * ## The response can contain YOUR secrets
 *
 * A webhook's `headersTemplate` is a free-form string that the *user* supplies,
 * and its documented purpose is to carry auth headers to the receiving service —
 * the vendor's own example for the field is a bearer credential. Apify returns
 * it verbatim on read.
 *
 * Nothing is stripped here, and that is deliberate: unlike `proxy.password` or
 * `urlSigningSecretKey`, this is not an Apify-issued credential at a known path
 * but arbitrary user text at a field whose contents this app cannot classify.
 * Removing it would break the legitimate read-modify-write of a webhook, and
 * guessing at which parts are secret would corrupt it. So the rule is stated
 * rather than enforced: **if your webhook templates carry a credential, treat
 * this action's result as sensitive**, and prefer Get Webhook on a specific id
 * over listing everything into a workflow variable.
 */
interface Input {
  desc?: boolean;
  limit?: number;
  offset?: number;
}

const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description:
    "List the account's webhooks. Results include each webhook's header template, which may " +
    "contain secrets you configured.",
  params: [
    descParam,
    ...paginationParams(100, "Apify's own default and maximum is 1000; 100 is prefilled here."),
  ],
  output: [
    { key: "items", type: "array", label: "Webhooks" },
    { key: "total", type: "number", label: "Total webhooks" },
    { key: "count", type: "number", label: "Webhooks in this page" },
    { key: "offset", type: "number", label: "Offset of this page" },
  ],

  execute(input, ctx) {
    return new ApifyClient(ctx).data<ApifyListPage<unknown>>("/webhooks", {
      query: { desc: flag(input.desc), limit: input.limit, offset: input.offset },
    });
  },
};

export default webhookList;
