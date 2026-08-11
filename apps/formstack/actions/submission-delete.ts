import type { ActionDefinition } from "@w6w/types";
import { FormstackClient } from "../lib/client.ts";

/**
 * `DELETE /submissions/{submissionId}` — delete a submission.
 *
 * The vendor's own description is "Permanently delete a submission and all
 * associated data" — including uploaded files. There is no trash and no undo,
 * which is why the description leads with that rather than with the mechanics.
 *
 * Idempotent in the sense the runtime cares about: a retry cannot delete a
 * second submission.
 */
interface Input {
  submissionId: string;
}

const submissionDelete: ActionDefinition<Input> = {
  key: "submission-delete",
  type: "perform",
  resource: "submission",
  title: "Delete Submission",
  description:
    "Permanently delete a submission and all of its associated data, including uploaded files. " +
    "There is no undo.",
  idempotent: true,
  params: [{ key: "submissionId", label: "Submission ID", type: "string", required: true }],
  output: [],

  execute(input, ctx) {
    return new FormstackClient(ctx).request(
      `/submissions/${encodeURIComponent(input.submissionId)}`,
      { method: "DELETE" },
    );
  },
};

export default submissionDelete;
