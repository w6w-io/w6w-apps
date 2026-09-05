import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

const ticketGet: ActionDefinition<Input> = {
  key: "ticket-get",
  type: "read",
  resource: "ticket",
  title: "Get Ticket",
  description: "Fetch a single ticket by its uid.",
  params: [idParam("Ticket", "The ticket's uid, from a prior list call.")],
  output: [
    { key: "id", type: "string", label: "Ticket ID" },
    { key: "name", type: "string", label: "Attendee name" },
    { key: "checked_in_at", type: "string", label: "Checked in at" },
  ],

  async execute(input, ctx) {
    return await new GivebutterClient(ctx).data(`/tickets/${encodeURIComponent(input.id)}`);
  },
};

export default ticketGet;
