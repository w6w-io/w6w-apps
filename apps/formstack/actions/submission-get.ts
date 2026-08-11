import type { ActionDefinition } from "@w6w/types";
import { flag, FormstackClient } from "../lib/client.ts";

/**
 * `GET /submissions/{submissionId}` — one submission.
 *
 * Note the path: submissions are addressed **globally by their own id**, not
 * under the form they belong to. Only the *list* endpoint is form-scoped.
 */
interface Input {
  submissionId: string;
  expandData?: boolean;
}

const submissionGet: ActionDefinition<Input> = {
  key: "submission-get",
  type: "read",
  resource: "submission",
  title: "Get Submission",
  description: "Fetch a single submission and its field data by id.",
  params: [
    {
      key: "submissionId",
      label: "Submission ID",
      type: "string",
      required: true,
      hint: "Submissions are addressed by their own id — no form id is needed here.",
    },
    {
      key: "expandData",
      label: "Expand field data",
      type: "boolean",
      hint: "Return parsed values rather than raw ones.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Submission id" }],

  execute(input, ctx) {
    return new FormstackClient(ctx).request(
      `/submissions/${encodeURIComponent(input.submissionId)}`,
      { query: { expandData: flag(input.expandData) } },
    );
  },
};

export default submissionGet;
