import type { ActionDefinition } from "@w6w/types";
import { JiraDcClient } from "../lib/client.ts";

interface Input {
  projectIdOrKey: string;
  expand?: string;
}

const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Read a single project by key or id.",
  params: [
    { key: "projectIdOrKey", label: "Project key or ID", type: "string", required: true },
    { key: "expand", label: "Expand", type: "string", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "key", type: "string", label: "Project key" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new JiraDcClient(ctx).request(
      `/project/${encodeURIComponent(input.projectIdOrKey)}`,
      { query: { expand: input.expand } },
    );
  },
};

export default projectGet;
