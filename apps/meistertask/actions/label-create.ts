import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";
import { labelColorOptions } from "../lib/params.ts";

/** `POST /projects/:project_id/labels` — create a label in a project. */
interface Input {
  projectId: number;
  name: string;
  color?: string;
}

const labelCreate: ActionDefinition<Input> = {
  key: "label-create",
  type: "perform",
  resource: "label",
  title: "Create Label",
  description: "Create a label in a project. The name must be unique (case-insensitive) " +
    "within the project.",
  idempotent: false,
  params: [
    { key: "projectId", label: "Project ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "color", label: "Color", type: "select", options: labelColorOptions },
  ],
  output: [
    { key: "id", type: "number", label: "Label ID" },
    { key: "project_id", type: "number", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "color", type: "string", label: "Color" },
  ],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request(`/projects/${input.projectId}/labels`, {
      method: "POST",
      body: { name: input.name, color: input.color },
    });
  },
};

export default labelCreate;
