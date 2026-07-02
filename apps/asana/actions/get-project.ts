import type { ActionDefinition } from "@w6w/types";
import { AsanaClient } from "../lib/client.ts";

interface Input {
  id: string;
  opt_fields?: string;
}

const getProject: ActionDefinition<Input> = {
  key: "get-project",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Retrieve a single project by ID.",
  params: [
    { key: "id", label: "Project ID", type: "string", required: true },
    { key: "opt_fields", label: "Fields", type: "string" },
  ],

  async execute(input, ctx) {
    return new AsanaClient(ctx).request(`/projects/${input.id}`, {
      query: { opt_fields: input.opt_fields },
    });
  },
};

export default getProject;
