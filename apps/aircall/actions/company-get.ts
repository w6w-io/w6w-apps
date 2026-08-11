import type { ActionDefinition } from "@w6w/types";
import { AircallClient } from "../lib/client.ts";

type Input = Record<string, never>;

/**
 * `GET /v1/company` — the account's name and its user/number counts.
 *
 * The whole object is three fields: `name`, `users_count`, `numbers_count`.
 * Companies are read-only through the Public API — "Companies are not updatable
 * nor destroyable via Aircall Public API. The only way to do so is via the
 * Aircall Dashboard."
 *
 * This is the only endpoint that names the account, which makes it the obvious
 * candidate for labelling a Connection. It is deliberately NOT used that way —
 * see the note at the end of `auth/basic.ts`: publishing an organisation's
 * headcount into ambient Connection metadata is a lot to spend on a display
 * string. Here it is a step's explicit output, which is a different bargain.
 */
const companyGet: ActionDefinition<Input> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Retrieve Company",
  description:
    "Fetch the account's name and its user and number counts. Read-only — companies are only " +
    "editable in the Aircall Dashboard.",
  params: [],
  output: [
    { key: "name", type: "string", label: "Company name" },
    { key: "users_count", type: "number", label: "Users in the company" },
    { key: "numbers_count", type: "number", label: "Phone Numbers in the company" },
  ],

  async execute(_input, ctx) {
    const client = new AircallClient(ctx);
    return await client.entity("/company", "company");
  },
};

export default companyGet;
