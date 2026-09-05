import type { ActionDefinition } from "@w6w/types";
import { DonorboxClient } from "../lib/client.ts";
import { compact, paginationParams, paginationQuery } from "../lib/params.ts";

interface Input {
  payment_status?: string;
  page?: number;
  per_page?: number;
  order?: string;
}

/**
 * `GET /api/v1/tickets`.
 *
 * "Ticket filters" documents exactly one value: "Use `payment_status=refunded`
 * to fetch only refunded tickets." No other value is documented for this
 * endpoint (contrast `purchase-list`, whose own filter documents four), so
 * this stays a plain string param rather than a guessed enum.
 */
const ticketList: ActionDefinition<Input> = {
  key: "ticket-list",
  type: "search",
  resource: "ticket",
  title: "List Tickets",
  description: "List event tickets sold on the connected Donorbox organization.",
  params: [
    {
      key: "payment_status",
      label: "Payment status",
      type: "string",
      hint: "The only value the README documents for this endpoint is `refunded` (fetch only " +
        "refunded tickets). Leave empty to list everything.",
    },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Tickets" },
  ],

  async execute(input, ctx) {
    const data = await new DonorboxClient(ctx).list("/tickets", {
      query: compact({ payment_status: input.payment_status, ...paginationQuery(input) }),
    });
    return { data };
  },
};

export default ticketList;
