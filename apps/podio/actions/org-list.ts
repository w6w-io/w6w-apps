import type { ActionDefinition } from "@w6w/types";
import { PodioClient } from "../lib/client.ts";

/**
 * `GET /org/` — "Returns a list of all the organizations and spaces the user is
 * member of."
 *
 * The entry point to Podio's hierarchy, and the cheapest one: each org carries
 * an inline `spaces` array, so this single call gives both levels and usually
 * removes the need for List Workspaces entirely.
 *
 * Two things it is *not*. It returns the orgs **the user is a member of**, not
 * every org they can see — a guest with access to one workspace of an org they
 * do not belong to will not find that org here. And it is not reachable under
 * App Authentication: Podio's reference carries no "Can be used with App
 * Authentication" badge on it, because an app token has no user to be a member
 * of anything.
 *
 * There is no pagination and no filter; the endpoint documents no parameters.
 */
type Input = Record<string, never>;

const orgList: ActionDefinition<Input> = {
  key: "org-list",
  type: "read",
  resource: "organization",
  title: "List Organizations",
  description:
    "Every organization the connected user belongs to, each with the workspaces they are a " +
    "member of. Needs a user connection — an app connection has no user.",
  params: [],
  output: [{ key: "organizations", type: "array", label: "Organizations" }],

  async execute(_input, ctx) {
    const organizations = await new PodioClient(ctx).json<unknown[]>("/org/");
    return { organizations: organizations ?? [] };
  },
};

export default orgList;
