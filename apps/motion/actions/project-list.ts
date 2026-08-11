import type { ActionDefinition } from "@w6w/types";
import { MotionClient, V1 } from "../lib/client.ts";
import { cursorParam, pageOutput, workspaceIdParam } from "../lib/params.ts";

/**
 * `GET /v1/projects` — projects in a workspace.
 *
 * `workspaceId` is documented as optional here (unlike on recurring tasks, where
 * it is required), so leaving it empty returns projects across the workspaces the
 * key can see.
 *
 * The `projects` array is documented as *not* required on the response, so an
 * account with no projects may answer with `meta` alone — the client's page
 * reader returns an empty array in that case rather than `undefined`.
 */
interface Input {
  workspaceId?: string;
  cursor?: string;
}

const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "search",
  resource: "project",
  title: "List Projects",
  description: "List projects, optionally limited to one workspace.",
  params: [
    workspaceIdParam(false, "Leave empty to list projects across every workspace you belong to."),
    cursorParam,
  ],
  output: [
    { key: "items", type: "array", label: "Projects" },
    ...pageOutput,
  ],

  execute(input, ctx) {
    return new MotionClient(ctx).page(`${V1}/projects`, "projects", {
      query: { workspaceId: input.workspaceId, cursor: input.cursor },
    });
  },
};

export default projectList;
