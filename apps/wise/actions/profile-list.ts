import type { ActionDefinition } from "@w6w/types";
import { WiseClient } from "../lib/client.ts";

/**
 * `GET /profiles` — every profile (personal or business) this token can act
 * as. Answers a bare JSON array, wrapped here as `{ items }` to match the
 * shape every other list action in this app returns.
 *
 * This is also the personal-API-token guide's own worked "using a personal
 * API token" example, so it is the safest call in this app's surface to try
 * first against a new connection.
 */
interface Profile {
  id?: number;
  type?: "PERSONAL" | "BUSINESS";
}

const profileList: ActionDefinition<Record<string, never>> = {
  key: "profile-list",
  type: "search",
  resource: "profile",
  title: "List Profiles",
  description: "List the personal and business profiles this connection can act as.",
  params: [],
  output: [{ key: "items", type: "array", label: "Profiles" }],

  async execute(_input, ctx) {
    ctx.log("info", "listing Wise profiles");
    const items = await new WiseClient(ctx).json<Profile[]>("/profiles");
    return { items: items ?? [] };
  },
};

export default profileList;
