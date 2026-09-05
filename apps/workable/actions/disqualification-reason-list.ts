import type { ActionDefinition } from "@w6w/types";
import { WorkableClient } from "../lib/client.ts";

/**
 * `GET /disqualification_reasons` — required scope `r_jobs`, per the vendor's
 * OpenAPI document. Its own response schema and example are both an empty
 * `{}` (unlike every other list endpoint here, which ships a real example) —
 * that could not be confirmed against a live account either, so this
 * forwards the body verbatim rather than declaring an `output` shape this
 * app cannot vouch for. Feeds `candidate-disqualify`'s Reason ID field.
 */
const disqualificationReasonList: ActionDefinition = {
  key: "disqualification-reason-list",
  type: "read",
  resource: "candidate",
  title: "List Disqualification Reasons",
  description:
    "List the account's disqualification reasons, for `candidate-disqualify`'s Reason ID field. " +
    "Required scope: `r_jobs`. The vendor's own API reference gives no example response for this " +
    "endpoint, so the raw body is returned as-is.",
  params: [],

  execute(_input, ctx) {
    return new WorkableClient(ctx).json("/disqualification_reasons");
  },
};

export default disqualificationReasonList;
