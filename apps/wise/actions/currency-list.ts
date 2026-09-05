import type { ActionDefinition } from "@w6w/types";
import { WiseClient } from "../lib/client.ts";

/**
 * `GET /currencies` — every currency Wise supports for transfers.
 *
 * ## The one action in this app that needs no credential
 *
 * Verified live 2026-09-05: `GET /2026Q3/currencies` answers `200` with the
 * full currency list and **no** `Authorization` header at all, even though
 * the OpenAPI bundle's `security` for this operation lists `UserToken` and
 * `PersonalToken` as accepted schemes. A signed request also succeeds (the
 * schemes are accepted, just not required), so `requiresAuth: false` here
 * reflects what the endpoint actually does, not a guess from its name — the
 * same "HTTP 200 ≠ documented-as-open" trap other apps hit, checked the
 * other way around: this really is open, confirmed by both the response body
 * (the documented currency array, not an error or a generic 200 page) and by
 * matching Wise's own schema field-for-field.
 */
const currencyList: ActionDefinition<Record<string, never>> = {
  key: "currency-list",
  type: "search",
  resource: "currency",
  title: "List Currencies",
  description: "List every currency Wise supports for transfers.",
  requiresAuth: false,
  params: [],
  output: [{ key: "items", type: "array", label: "Currencies" }],

  async execute(_input, ctx) {
    const items = await new WiseClient(ctx).json<unknown[]>("/currencies");
    return { items: items ?? [] };
  },
};

export default currencyList;
