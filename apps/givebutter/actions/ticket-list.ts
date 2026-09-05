import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient, type PageEnvelope } from "../lib/client.ts";
import { paginationParams, paginationQuery } from "../lib/params.ts";

interface Input {
  page?: number;
  per_page?: number;
}

const ticketList: ActionDefinition<Input> = {
  key: "ticket-list",
  type: "read",
  resource: "ticket",
  title: "List Tickets",
  description: "List all tickets sold across every campaign on the connected account.",
  params: [...paginationParams()],
  output: [
    { key: "data", type: "array", label: "Tickets" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  async execute(input, ctx) {
    return await new GivebutterClient(ctx).page("/tickets", {
      query: paginationQuery(input),
    }) as PageEnvelope<unknown>;
  },
};

export default ticketList;
