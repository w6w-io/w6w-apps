import type { ActionDefinition } from "@w6w/types";
import { compact, JustCallClient } from "../lib/client.ts";

/**
 * `PUT /v2.1/calls/{id}` — verified against `call_update_v21`'s OpenAPI fragment,
 * 2026-09-05.
 *
 * The vendor's own description: modifies notes, disposition or rating for a
 * **completed** call; updates to an ongoing/in-progress call are not supported.
 */
interface Input {
  id: string | number;
  disposition_code?: string;
  notes?: string;
  rating?: number;
}

const callUpdate: ActionDefinition<Input> = {
  key: "call-update",
  type: "perform",
  resource: "call",
  title: "Update Call",
  description:
    "Update the notes, disposition or rating for a completed call. Updates to an ongoing or " +
    "in-progress call are not supported.",
  // A retry sends the same replacement values again; the vendor documents this
  // as a full replace of notes/disposition/rating, not an increment.
  idempotent: true,
  params: [
    { key: "id", label: "Call ID", type: "string", required: true },
    {
      key: "disposition_code",
      label: "Disposition code",
      type: "string",
      hint: 'Must already exist in your account, e.g. "Sales: Lead".',
    },
    { key: "notes", label: "Notes", type: "text", hint: "Replaces any existing note." },
    {
      key: "rating",
      label: "Rating",
      type: "number",
      hint: "0 to 5, 0.5 increments allowed.",
      validation: { min: 0, max: 5 },
    },
  ],
  output: [
    { key: "id", type: "number", label: "Call ID" },
    { key: "call_info", type: "object", label: "Updated notes, disposition and rating" },
  ],

  async execute(input, ctx) {
    const client = new JustCallClient(ctx);
    return await client.data(`/calls/${encodeURIComponent(String(input.id))}`, {
      method: "PUT",
      body: compact({
        disposition_code: input.disposition_code,
        notes: input.notes,
        rating: input.rating,
      }),
    });
  },
};

export default callUpdate;
