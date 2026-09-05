import type { ActionDefinition } from "@w6w/types";
import { JiraDcClient } from "../lib/client.ts";

interface Input {
  includeArchived?: boolean;
  recent?: number;
}

const projectGetMany: ActionDefinition<Input> = {
  key: "project-get-many",
  type: "search",
  resource: "project",
  title: "List Projects",
  description: "List every project visible to the connection — the source of project keys.",
  params: [
    { key: "includeArchived", label: "Include archived", type: "boolean", default: false },
    {
      key: "recent",
      label: "Recent count",
      type: "number",
      advanced: true,
      validation: { min: 1, integer: true },
      hint: "Return only the N most recently viewed projects instead of every project.",
    },
  ],
  // `GET /rest/api/2/project` returns a flat JSON array — Data Center never
  // paginates this endpoint, unlike Jira Cloud's `/project/search`.
  output: [{ key: "", type: "array", label: "Projects" }],

  execute(input, ctx) {
    return new JiraDcClient(ctx).request<unknown[]>("/project", {
      query: {
        includeArchived: input.includeArchived,
        recent: input.recent,
      },
    });
  },
};

export default projectGetMany;
