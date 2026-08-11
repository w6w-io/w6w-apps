import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, PodioClient } from "../lib/client.ts";
import { orgIdParam } from "../lib/params.ts";

/**
 * `GET /org/{org_id}/space/` — "Returns all the spaces for the organization."
 *
 * The API's word for a workspace is "space", everywhere, including in the path.
 * The Podio UI has said "workspace" for years. Both appear in this action's
 * labels so a reader coming from either side finds it.
 *
 * Distinct from the `spaces` array inline on List Organizations: that one is
 * filtered to the spaces the user is a *member* of, this one is all of the
 * org's. On a large org the difference is most of them.
 *
 * The endpoint documents no parameters beyond the org id — no pagination, no
 * archived/active filter.
 */
interface Input {
  orgId: string;
}

const spaceList: ActionDefinition<Input> = {
  key: "space-list",
  type: "read",
  resource: "workspace",
  title: "List Workspaces",
  description: "Every workspace (the API calls it a space) in one organization. Broader than the " +
    "spaces inlined on List Organizations, which are only the ones you are a member of.",
  params: [orgIdParam],
  output: [{ key: "spaces", type: "array", label: "Workspaces" }],

  async execute(input, ctx) {
    const spaces = await new PodioClient(ctx).json<unknown[]>(
      `/org/${encodeSegment(input.orgId)}/space/`,
    );
    return { spaces: spaces ?? [] };
  },
};

export default spaceList;
