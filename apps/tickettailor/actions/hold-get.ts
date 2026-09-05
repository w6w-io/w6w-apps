import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";

/** `GET /v1/holds/{hold_id}` — verified against `getHoldById`, 2026-09-05. */
interface Input {
  holdId: string;
}

const holdGet: ActionDefinition<Input> = {
  key: "hold-get",
  type: "read",
  resource: "hold",
  title: "Get Hold",
  description: "Fetch a single hold by ID.",
  params: [
    { key: "holdId", label: "Hold ID", type: "string", required: true, placeholder: "ho_123" },
  ],
  output: [
    { key: "id", type: "string", label: "Hold ID" },
    { key: "note", type: "string", label: "Note" },
    { key: "event_id", type: "string", label: "Event ID" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request(`/holds/${encodeURIComponent(input.holdId)}`);
  },
};

export default holdGet;
