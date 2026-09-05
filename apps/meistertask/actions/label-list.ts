import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/** `GET /projects/:project_id/labels` — the labels defined in a project. */
interface Input {
  projectId: number;
}

const labelList: ActionDefinition<Input, unknown[]> = {
  key: "label-list",
  type: "search",
  resource: "label",
  title: "List Labels",
  description: "List the labels defined in a project.",
  params: [{ key: "projectId", label: "Project ID", type: "number", required: true }],
  output: [{ key: "", type: "array", label: "Labels" }],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request<unknown[]>(`/projects/${input.projectId}/labels`);
  },
};

export default labelList;
