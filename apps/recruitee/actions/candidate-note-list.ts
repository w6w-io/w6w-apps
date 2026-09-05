import type { ActionDefinition } from "@w6w/types";
import { RecruiteeClient } from "../lib/client.ts";
import { candidateIdParam } from "../lib/params.ts";

/** `GET /c/{company_id}/candidates/{candidate_id}/notes` — "List notes for candidate". */
interface Input {
  candidateId: number;
}

const candidateNoteList: ActionDefinition<Input> = {
  key: "candidate-note-list",
  type: "search",
  resource: "note",
  title: "List Candidate Notes",
  description: "List the notes left on a candidate's profile.",
  params: [candidateIdParam],
  output: [
    { key: "notes", type: "array", label: "Notes" },
    { key: "references", type: "array", label: "Related admins the response references" },
  ],

  execute(input, ctx) {
    return new RecruiteeClient(ctx).request(`/candidates/${input.candidateId}/notes`);
  },
};

export default candidateNoteList;
