import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, HoldedClient } from "../lib/client.ts";

/**
 * `POST /leads/{leadId}/notes` — add a new note to a lead.
 *
 * Not idempotent: each call appends a new note (it becomes one more entry in
 * the lead's `events` array), and there is no field to make a retry return the
 * first note instead of creating a second one.
 */
interface Input {
  leadId: string;
  title: string;
  desc?: string;
}

const leadNoteCreate: ActionDefinition<Input> = {
  key: "lead-note-create",
  type: "perform",
  resource: "lead",
  title: "Create Lead Note",
  description: "Add a new note to a lead.",
  idempotent: false,
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Leads result.",
    },
    { key: "title", label: "Title", type: "string", required: true },
    { key: "desc", label: "Description", type: "text" },
  ],
  output: [
    { key: "status", type: "number", label: "1 on success" },
    { key: "info", type: "string", label: "Human status message" },
    { key: "id", type: "string", label: "New note ID" },
  ],

  execute(input, ctx) {
    const body = compact({ title: input.title, desc: input.desc });
    return new HoldedClient(ctx).write(`/leads/${encodeId(input.leadId)}/notes`, "POST", body);
  },
};

export default leadNoteCreate;
