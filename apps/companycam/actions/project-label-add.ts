import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId, toList } from "../lib/client.ts";

/**
 * `POST /v2/projects/{project_id}/labels` — apply labels to a project.
 *
 * The body nests oddly — `{"project": {"labels": ["…"]}}` — and the labels are
 * **display strings, not ids**: an unknown one is created rather than rejected,
 * which is convenient and is also how a typo becomes a permanent second label
 * on the company's list.
 *
 * Marked NOT idempotent. The vendor documents no de-duplication and the
 * response is a single `Tag`, so a retried call may apply a second copy. If
 * that turns out to be a no-op in practice it costs a retry, which is the
 * cheaper mistake.
 */
interface Input {
  projectId: string;
  labels: string[] | string;
}

const projectLabelAdd: ActionDefinition<Input> = {
  key: "project-label-add",
  type: "perform",
  resource: "project",
  title: "Add Project Labels",
  description: "Apply one or more labels to a project by display value, creating any that are new.",
  idempotent: false,
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    {
      key: "labels",
      label: "Labels",
      type: "string",
      repeat: true,
      required: true,
      hint: "Display values, not ids. A value that does not exist yet is created — check your " +
        "spelling.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Label ID" },
    { key: "display_value", type: "string", label: "Display value" },
    { key: "value", type: "string", label: "Normalised value" },
  ],

  execute(input, ctx) {
    const labels = toList(input.labels);
    if (!labels?.length) throw new Error("At least one label is required");

    return new CompanyCamClient(ctx).json(`/projects/${encodeId(input.projectId)}/labels`, {
      method: "POST",
      body: { project: { labels } },
    });
  },
};

export default projectLabelAdd;
