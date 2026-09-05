import type { ActionDefinition } from "@w6w/types";
import type { DeleteResult } from "../lib/client.ts";
import { TicketTailorClient } from "../lib/client.ts";

/**
 * `DELETE /v1/holds/{hold_id}` — verified against `deleteHoldById`,
 * 2026-09-05. Irreversible. Answers `200` with a small JSON body, never
 * `204` — see `lib/client.ts`.
 */
interface Input {
  holdId: string;
}

const holdDelete: ActionDefinition<Input, DeleteResult> = {
  key: "hold-delete",
  type: "perform",
  resource: "hold",
  title: "Delete Hold",
  description: "Permanently release a hold, returning its tickets to sale. Irreversible.",
  idempotent: false,
  params: [
    { key: "holdId", label: "Hold ID", type: "string", required: true, placeholder: "ho_123" },
  ],
  output: [
    { key: "id", type: "string", label: "Deleted hold ID" },
    { key: "object", type: "string", label: "Object type" },
    { key: "deleted", type: "string", label: '"true" on success' },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request<DeleteResult>(
      `/holds/${encodeURIComponent(input.holdId)}`,
      { method: "DELETE" },
    );
  },
};

export default holdDelete;
