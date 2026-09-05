import type { ActionDefinition } from "@w6w/types";
import { RecruiteeClient } from "../lib/client.ts";
import { candidateIdParam } from "../lib/params.ts";

/**
 * `DELETE /c/{company_id}/candidates/{id}` — a soft delete: the vendor's own
 * response example still returns the full candidate object with a
 * `deleted_at` timestamp set, not a 204.
 */
interface Input {
  candidateId: number;
}

const candidateDelete: ActionDefinition<Input> = {
  key: "candidate-delete",
  type: "perform",
  resource: "candidate",
  title: "Delete Candidate",
  description: "Soft-delete a candidate.",
  // Retrying a dropped response either repeats the same delete or lands on an
  // already-deleted candidate — never a worse outcome than the first attempt.
  idempotent: true,
  params: [candidateIdParam],
  output: [
    { key: "candidate", type: "object", label: "The deleted candidate" },
    { key: "references", type: "array", label: "Related data the response references" },
  ],

  execute(input, ctx) {
    return new RecruiteeClient(ctx).request(`/candidates/${input.candidateId}`, {
      method: "DELETE",
    });
  },
};

export default candidateDelete;
