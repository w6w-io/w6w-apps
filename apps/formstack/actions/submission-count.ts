import type { ActionDefinition } from "@w6w/types";
import { FormstackClient } from "../lib/client.ts";

/**
 * `GET /forms/{formId}/submissions/count` — how many entries a form has.
 *
 * The cheap way to answer "has anything new arrived?" without pulling a page of
 * submissions and their field data.
 */
interface Input {
  formId: string;
  minTime?: string;
  maxTime?: string;
}

const submissionCount: ActionDefinition<Input> = {
  key: "submission-count",
  type: "read",
  resource: "submission",
  title: "Count Submissions",
  description: "Count a form's submissions without fetching them.",
  params: [
    { key: "formId", label: "Form ID", type: "string", required: true },
    { key: "minTime", label: "Submitted on or after", type: "datetime" },
    { key: "maxTime", label: "Submitted on or before", type: "datetime" },
  ],
  output: [{ key: "count", type: "number", label: "Matching submissions" }],

  execute(input, ctx) {
    return new FormstackClient(ctx).request(
      `/forms/${encodeURIComponent(input.formId)}/submissions/count`,
      { query: { minTime: input.minTime, maxTime: input.maxTime } },
    );
  },
};

export default submissionCount;
