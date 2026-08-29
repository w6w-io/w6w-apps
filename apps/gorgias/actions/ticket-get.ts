import type { ActionDefinition } from "@w6w/types";
import { GorgiasClient } from "../lib/client.ts";
import { ticketOutput } from "../lib/params.ts";

interface Input {
  ticketId: number;
}

const ticketGet: ActionDefinition<Input> = {
  key: "ticket-get",
  type: "read",
  resource: "ticket",
  title: "Get Ticket",
  description: "Retrieve a single ticket by ID.",
  params: [
    { key: "ticketId", label: "Ticket ID", type: "number", required: true },
  ],
  output: ticketOutput,

  execute(input, ctx) {
    return new GorgiasClient(ctx).request(`/tickets/${input.ticketId}`);
  },
};

export default ticketGet;
