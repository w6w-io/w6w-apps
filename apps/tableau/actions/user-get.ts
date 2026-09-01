import type { ActionDefinition } from "@w6w/types";
import { TableauClient } from "../lib/client.ts";

/**
 * `GET /sites/{siteId}/users/{userId}` — verified against Tableau's "Query
 * User On Site" reference page.
 *
 * The vendor's own permissions note is worth reading twice: server and site
 * administrators can look up any user directly, but "use of this method by
 * non-administrator users to view their own information depends on the
 * visibility settings of a site" — so a non-admin PAT calling this on its
 * own user id can still 403 on a site with restrictive user visibility.
 */
const action: ActionDefinition = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get a user",
  description: "Read one user's profile on this site.",
  params: [
    { key: "userId", label: "User ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "siteRole", type: "string", label: "Site role" },
    { key: "email", type: "string", label: "Email" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const userId = String(p.userId ?? "").trim();
    if (!userId) throw new Error("`userId` is required");

    const body = await new TableauClient(ctx).request<{ user: Record<string, unknown> }>(
      `/users/${encodeURIComponent(userId)}`,
    );
    return body.user;
  },
};

export default action;
