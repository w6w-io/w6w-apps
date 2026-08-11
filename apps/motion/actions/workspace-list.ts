import type { ActionDefinition } from "@w6w/types";
import { MotionClient, V1 } from "../lib/client.ts";
import { cursorParam, pageOutput } from "../lib/params.ts";

/**
 * `GET /v1/workspaces` — the workspaces this key can see.
 *
 * The starting point for almost everything else: a workspace id is required by
 * create-task, create-project, create-recurring-task and the whole custom-field
 * surface. A workspace also carries its own `labels` and `statuses` arrays, so
 * this one call answers "what labels may I use" and "what statuses exist"
 * without a second request.
 *
 * The `ids` query parameter documented on this endpoint is not offered — it is
 * typed `array<string>` and Motion publishes no example request, so its wire
 * encoding is unspecified. See `lib/params.ts`.
 */
interface Input {
  cursor?: string;
}

const workspaceList: ActionDefinition<Input> = {
  key: "workspace-list",
  type: "search",
  resource: "workspace",
  title: "List Workspaces",
  description:
    "List the workspaces this API key can see, each with its labels and statuses. The source of " +
    "the workspace id every write endpoint needs.",
  params: [cursorParam],
  output: [
    {
      key: "items",
      type: "array",
      label: "Workspaces — each { id, name, teamId, type, labels, statuses }",
    },
    ...pageOutput,
  ],

  execute(input, ctx) {
    return new MotionClient(ctx).page(`${V1}/workspaces`, "workspaces", {
      query: { cursor: input.cursor },
    });
  },
};

export default workspaceList;
