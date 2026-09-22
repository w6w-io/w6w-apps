import type { ActionDefinition } from "@w6w/types";
import { BrexClient, type BrexCompany } from "../lib/client.ts";

/**
 * `GET /v2/company` — the company the credential belongs to.
 *
 * Four fields, and the naming is Brex's own mixture: `legal_name` and
 * `mailing_address` are snake_case while `accountType` is camelCase. Both are
 * passed through verbatim.
 *
 * `accountType` is the interesting one: `BREX_CLASSIC` or `BREX_EMPOWER`. It is
 * the account-level distinction behind several of this API's entitlement gates —
 * Brex documents that creating a card requires budget management on Empower
 * accounts and answers `403` where that is missing. This action is how a
 * workflow can tell which kind of account it is looking at *before* running
 * something that may be gated.
 *
 * No parameters: the company is whatever the token belongs to.
 */
const companyGet: ActionDefinition<Record<string, never>> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get Company",
  description:
    "Fetch the Brex company the connection's token belongs to, including whether the account is " +
    "BREX_CLASSIC or BREX_EMPOWER.",
  params: [],
  output: [
    { key: "id", type: "string", label: "Company id" },
    { key: "legal_name", type: "string", label: "Legal name" },
    { key: "mailing_address", type: "object", label: "Mailing address" },
    { key: "accountType", type: "string", label: "Account type — BREX_CLASSIC or BREX_EMPOWER" },
  ],

  execute(_input, ctx) {
    return new BrexClient(ctx).json<BrexCompany>("/company");
  },
};

export default companyGet;
