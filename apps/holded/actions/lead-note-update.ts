import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, HoldedClient } from "../lib/client.ts";

/**
 * `PUT /leads/{leadId}/notes` — update an existing note's title or
 * description. `noteId` is required; "only the params included in the
 * operation will update the note".
 */
interface Input {
  leadId: string;
  noteId: string;
  title?: string;
  desc?: string;
}

const leadNoteUpdate: ActionDefinition<Input> = {
  key: "lead-note-update",
  type: "perform",
  resource: "lead",
  title: "Update Lead Note",
  description: "Update an existing lead note's title or description.",
  idempotent: true,
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Leads result.",
    },
    {
      key: "noteId",
      label: "Note ID",
      type: "string",
      required: true,
      hint: "From the `eventId` of a note in the lead's `events` array.",
    },
    { key: "title", label: "Title", type: "string" },
    { key: "desc", label: "Description", type: "text" },
  ],
  output: [
    { key: "status", type: "number", label: "1 on success" },
    { key: "info", type: "string", label: "Human status message" },
    { key: "id", type: "string", label: "Note ID" },
  ],

  execute(input, ctx) {
    const body = compact({ noteId: input.noteId, title: input.title, desc: input.desc });
    return new HoldedClient(ctx).write(`/leads/${encodeId(input.leadId)}/notes`, "PUT", body);
  },
};

export default leadNoteUpdate;
