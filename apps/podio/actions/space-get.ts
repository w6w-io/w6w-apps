import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, PodioClient } from "../lib/client.ts";
import { spaceIdParam } from "../lib/params.ts";

/**
 * `GET /space/{space_id}` — one workspace.
 *
 * Worth having beside List Workspaces because the single-space response carries
 * fields the list does not: `privacy` (`open` / `closed`), `auto_join`, the
 * creator, and `rights` — the list of things the connected identity may do
 * here. Branching a workflow on `rights` before attempting a write is cheaper
 * than branching on the 403 afterwards.
 */
interface Input {
  spaceId: string;
}

const spaceGet: ActionDefinition<Input> = {
  key: "space-get",
  type: "read",
  resource: "workspace",
  title: "Get Workspace",
  description:
    "One workspace, including its privacy setting and the rights the connected identity " +
    "holds on it.",
  params: [spaceIdParam],
  output: [{ key: "space", type: "object", label: "Workspace" }],

  async execute(input, ctx) {
    const space = await new PodioClient(ctx).json<Record<string, unknown>>(
      `/space/${encodeSegment(input.spaceId)}`,
    );
    return { space: space ?? {} };
  },
};

export default spaceGet;
