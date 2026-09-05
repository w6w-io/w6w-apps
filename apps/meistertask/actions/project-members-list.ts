import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/**
 * `GET /projects/:id/members` — the project rights and (Business plan)
 * group/team memberships that grant access to a project.
 *
 * The vendor's own documented example for this endpoint is not valid JSON —
 * it uses Ruby's `=>` hash-rocket syntax (`"id"=>5859`) instead of `:` — so
 * the response shape below is inferred from the field names in that example
 * rather than a machine-checked schema. `output` is left as a single opaque
 * object for that reason.
 */
interface Input {
  id: number;
  includePersons?: boolean;
}

const projectMembersList: ActionDefinition<Input> = {
  key: "project-members-list",
  type: "search",
  resource: "project",
  title: "List Project Members",
  description: "List a project's members: individual project rights plus, on the Business " +
    "plan, group and team memberships.",
  params: [
    { key: "id", label: "Project ID", type: "number", required: true },
    {
      key: "includePersons",
      label: "Include persons",
      type: "boolean",
      hint: "Also resolve the persons referenced by project rights and memberships.",
    },
  ],
  output: [
    { key: "project_rights", type: "array", label: "Project rights" },
    { key: "project_memberships", type: "array", label: "Project memberships (Business plan)" },
    { key: "persons", type: "array", label: "Resolved persons" },
  ],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request(`/projects/${input.id}/members`, {
      query: { include_persons: input.includePersons },
    });
  },
};

export default projectMembersList;
