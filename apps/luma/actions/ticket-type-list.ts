import type { ActionDefinition } from "@w6w/types";
import { compact, LumaClient } from "../lib/client.ts";
import { eventIdParam } from "../lib/params.ts";

interface Input {
  eventId: string;
  includeHidden?: boolean;
}

/** `GET /v1/events/ticket-types/list`. Not cursor-paginated — no `has_more`/`next_cursor`. */
const ticketTypeList: ActionDefinition<Input> = {
  key: "ticket-type-list",
  type: "search",
  resource: "ticket-type",
  title: "List Ticket Types",
  description: "List the ticket types offered for an event.",
  params: [
    eventIdParam,
    { key: "includeHidden", label: "Include hidden", type: "boolean" },
  ],
  output: [{ key: "entries", type: "array", label: "Ticket types" }],

  execute(input, ctx) {
    return new LumaClient(ctx).json("/v1/events/ticket-types/list", {
      query: compact({
        event_id: input.eventId,
        // Documented as a `string` schema type despite being a yes/no toggle —
        // sent as the literal string Luma's own schema declares.
        include_hidden: input.includeHidden ? "true" : undefined,
      }),
    });
  },
};

export default ticketTypeList;
