import type { ActionDefinition } from "@w6w/types";
import { AgencyZoomClient, type GenericSuccessResponse } from "../lib/client.ts";

/** `POST /v1/api/leads/{leadId}/notes` — add a free-text note to a lead. */
interface Input {
  leadId: number;
  note: string;
}

const leadNoteCreate: ActionDefinition<Input> = {
  key: "lead-note-create",
  type: "perform",
  resource: "lead",
  title: "Add Lead Note",
  description: "Add a note to a lead's activity timeline.",
  idempotent: false,
  params: [
    { key: "leadId", label: "Lead ID", type: "number", required: true },
    { key: "note", label: "Note", type: "text", required: true },
  ],
  output: [{ key: "message", type: "string", label: "Confirmation message" }],

  execute(input, ctx) {
    return new AgencyZoomClient(ctx).post<GenericSuccessResponse>(
      `/leads/${input.leadId}/notes`,
      { note: input.note },
    );
  },
};

export default leadNoteCreate;
