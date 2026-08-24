import type { ActionDefinition } from "@w6w/types";
import { ClickSendClient } from "../lib/client.ts";

type Input = Record<string, never>;

export interface Country {
  code?: string;
  value?: string;
}

/**
 * `GET /countries` — the ISO 3166 alpha-2 country list ClickSend recognizes for
 * `country`/`address_country` fields elsewhere in this app.
 *
 * Verified live on 2026-08-24: this endpoint answers `200` with **no** credential
 * at all, and again with a syntactically wrong one — it is genuinely public, not
 * merely tolerant of a bad key. `requiresAuth: false` reflects that rather than
 * routing every call through `sign` for no reason. (It is also why this endpoint
 * would be a bad choice for the Auth `test` probe: an unconnected or
 * wrongly-configured Connection would sail straight through it.)
 */
const countriesList: ActionDefinition<Input> = {
  key: "countries-list",
  type: "read",
  resource: "reference",
  title: "List Countries",
  description: "List the ISO 3166 alpha-2 country codes ClickSend recognizes (GET /countries). " +
    "Public — no Connection required.",
  requiresAuth: false,
  params: [],
  output: [{ key: "countries", type: "array", label: "Countries" }],

  async execute(_input, ctx) {
    const client = new ClickSendClient(ctx);
    const countries = await client.data<Country[]>("/countries");
    return { countries: countries ?? [] };
  },
};

export default countriesList;
