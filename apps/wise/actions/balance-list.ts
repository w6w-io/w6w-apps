import type { ActionDefinition } from "@w6w/types";
import { WiseClient } from "../lib/client.ts";
import { profileIdParam } from "../lib/params.ts";

/**
 * `GET /profiles/{profileId}/balances` — the profile's multi-currency
 * balances.
 *
 * `types` is a **required** query parameter (`STANDARD`, `SAVINGS`, or both,
 * comma-separated) — there is no vendor-side default, unlike almost every
 * other list filter in this API, so this action requires it rather than
 * silently guessing which balance kind the caller wants.
 *
 * Only balances with `investmentState: "NOT_INVESTED"` can be operated on
 * further via the API; invested balances are still returned here but are
 * read-only per the vendor's own note.
 */
interface Input {
  profileId: number;
  /** A `multiselect` param arrives as `string[]`; a caller can also pass an already-joined string. */
  types: string | string[];
}

const balanceList: ActionDefinition<Input> = {
  key: "balance-list",
  type: "search",
  resource: "balance",
  title: "List Balances",
  description: "List a profile's multi-currency balances, by balance kind.",
  params: [
    profileIdParam,
    {
      key: "types",
      label: "Balance types",
      type: "multiselect",
      required: true,
      default: ["STANDARD"],
      options: [
        { value: "STANDARD", label: "Standard — one per currency" },
        { value: "SAVINGS", label: "Savings (Jars) — several allowed per currency" },
      ],
      hint: "Wise requires this filter explicitly; there is no default.",
    },
  ],
  output: [{ key: "items", type: "array", label: "Balances" }],

  async execute(input, ctx) {
    const types = Array.isArray(input.types) ? input.types.join(",") : input.types;
    const items = await new WiseClient(ctx).json<unknown[]>(
      `/profiles/${input.profileId}/balances`,
      { query: { types } },
    );
    return { items: items ?? [] };
  },
};

export default balanceList;
