import type { ActionDefinition } from "@w6w/types";
import { RecruiteeClient } from "../lib/client.ts";
import { candidateIdParam } from "../lib/params.ts";

/**
 * `POST /c/{company_id}/candidates/{candidate_id}/notes` — verified against
 * the `Create note for candidate` resource. The vendor accepts either plain
 * `note.body` or a structured `note.body_json`; only the plain-text form is
 * exposed here, since a rich-text document is not something a workflow step
 * can reasonably compose.
 */
interface Input {
  candidateId: number;
  body: string;
}

const candidateNoteCreate: ActionDefinition<Input> = {
  key: "candidate-note-create",
  type: "perform",
  resource: "note",
  title: "Create Candidate Note",
  description: "Add a text note to a candidate's profile.",
  // Every call adds a new, independent note — there is no key that would make
  // a retry land on the same note instead of creating a second one.
  idempotent: false,
  params: [
    candidateIdParam,
    { key: "body", label: "Note text", type: "text", required: true },
  ],
  output: [
    { key: "note", type: "object", label: "The created note" },
    { key: "references", type: "array", label: "Related admins the response references" },
  ],

  execute(input, ctx) {
    return new RecruiteeClient(ctx).request(`/candidates/${input.candidateId}/notes`, {
      method: "POST",
      body: { note: { body: input.body } },
    });
  },
};

export default candidateNoteCreate;
