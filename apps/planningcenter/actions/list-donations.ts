import type { ActionDefinition } from "@w6w/types";
import { type JsonApiCollection, PlanningCenterClient } from "../lib/client.ts";

interface Input {
  receivedAtGte?: string;
  receivedAtLte?: string;
  fundId?: string;
  perPage?: number;
  offset?: number;
}

interface DonationAttributes {
  amount_cents?: number;
  amount_currency?: string;
  received_at?: string;
  completed_at?: string;
  payment_method?: string;
  payment_status?: string;
  refunded?: boolean;
}

interface Output {
  donations: Array<{
    id: string;
    amountCents?: number;
    amountCurrency?: string;
    receivedAt?: string;
    completedAt?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    refunded?: boolean;
    personId?: string;
  }>;
  totalCount?: number;
  nextOffset?: number;
}

/**
 * `GET /giving/v2/donations`.
 *
 * Amounts are in CENTS (`amount_cents`) in the organization's own currency
 * (`amount_currency`) — verified against `donation_attributes` in the live
 * Giving OpenAPI document. Dividing by 100 without checking `amount_currency`
 * silently mishandles a zero-decimal currency; this action leaves the raw
 * cents value untouched rather than guessing a conversion.
 *
 * `where[fund_id]` is documented (`donation_where_fund_id_parameter`) even
 * though `fund_id` is not itself a `Donation` attribute — Planning Center
 * resolves it against the donation's `Designation` records. Per-fund SPLIT
 * amounts (a single donation can be designated across several funds) live on
 * `Designation`, a resource this action does not read; see the README.
 */
const listDonations: ActionDefinition<Input, Output> = {
  key: "list-donations",
  type: "search",
  title: "List Donations",
  description: "List donations, optionally filtered by date range or fund.",
  params: [
    {
      key: "receivedAtGte",
      label: "Received on/after",
      type: "date",
      row: "range",
      hint: "ISO 8601 date.",
    },
    { key: "receivedAtLte", label: "Received on/before", type: "date", row: "range" },
    { key: "fundId", label: "Fund ID", type: "string", hint: "Restrict to one Fund." },
    { key: "perPage", label: "Per page", type: "number", default: 25, hint: "Maximum 100." },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "donations", type: "array", label: "Donations" },
    { key: "totalCount", type: "number", label: "Total count" },
    { key: "nextOffset", type: "number", label: "Next page offset" },
  ],

  async execute(input, ctx) {
    const client = new PlanningCenterClient(ctx);
    const body = await client.get<JsonApiCollection<DonationAttributes>>("giving", "/donations", {
      where: {
        received_at: {
          gte: input.receivedAtGte,
          lte: input.receivedAtLte,
        },
        fund_id: input.fundId,
      },
      query: { per_page: input.perPage ?? 25, offset: input.offset ?? 0 },
    });

    return {
      donations: body.data.map((d) => ({
        id: d.id,
        amountCents: d.attributes.amount_cents,
        amountCurrency: d.attributes.amount_currency,
        receivedAt: d.attributes.received_at,
        completedAt: d.attributes.completed_at,
        paymentMethod: d.attributes.payment_method,
        paymentStatus: d.attributes.payment_status,
        refunded: d.attributes.refunded,
        personId: (d.relationships?.person?.data as { id?: string } | undefined)?.id,
      })),
      totalCount: body.meta?.total_count,
      nextOffset: body.meta?.next?.offset,
    };
  },
};

export default listDonations;
