import type { ActionDefinition } from "@w6w/types";
import { WiseClient } from "../lib/client.ts";
import { offsetLimitParams } from "../lib/params.ts";

/**
 * `GET /transfers` — list transfers, with offset/limit pagination.
 *
 * A bare JSON array, unlike Recipient List's paged envelope — see
 * `recipient-list.ts` for the other shape Wise mixes across its list
 * endpoints. See "Tracking Transfers" in Wise's guides for the full status
 * vocabulary usable in the `status` filter.
 */
interface Input {
  profile?: number;
  status?: string;
  sourceCurrency?: string;
  targetCurrency?: string;
  createdDateStart?: string;
  createdDateEnd?: string;
  limit?: number;
  offset?: number;
}

const transferList: ActionDefinition<Input> = {
  key: "transfer-list",
  type: "search",
  resource: "transfer",
  title: "List Transfers",
  description: "List transfers, optionally filtered by profile, status, currency, or date range.",
  params: [
    {
      key: "profile",
      label: "Profile ID",
      type: "number",
      hint: "Defaults to the personal profile if omitted.",
    },
    {
      key: "status",
      label: "Status filter",
      type: "string",
      hint: "Comma-separated status codes, e.g. outgoing_payment_sent. See Wise's Tracking " +
        "Transfers guide for the full vocabulary.",
    },
    { key: "sourceCurrency", label: "Source currency", type: "string" },
    { key: "targetCurrency", label: "Target currency", type: "string" },
    {
      key: "createdDateStart",
      label: "Created after",
      type: "datetime",
      hint: "Inclusive of the provided date.",
    },
    {
      key: "createdDateEnd",
      label: "Created before",
      type: "datetime",
      hint: "Inclusive of the provided date.",
    },
    ...offsetLimitParams(50),
  ],
  output: [{ key: "items", type: "array", label: "Transfers" }],

  async execute(input, ctx) {
    const items = await new WiseClient(ctx).json<unknown[]>("/transfers", {
      query: {
        profile: input.profile,
        status: input.status,
        sourceCurrency: input.sourceCurrency,
        targetCurrency: input.targetCurrency,
        createdDateStart: input.createdDateStart,
        createdDateEnd: input.createdDateEnd,
        limit: input.limit,
        offset: input.offset,
      },
    });
    return { items: items ?? [] };
  },
};

export default transferList;
