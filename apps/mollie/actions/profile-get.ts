import type { ActionDefinition } from "@w6w/types";
import { MollieClient } from "../lib/client.ts";

/**
 * `GET /v2/profiles/me` — the current website profile: name, website,
 * status (`unverified`/`verified`/`blocked`) and business category. The
 * same read the `bearer` Auth's `test`/`afterConnect` hooks already use.
 */
type Input = Record<string, never>;

const profileGet: ActionDefinition<Input> = {
  key: "profile-get",
  type: "read",
  resource: "profile",
  title: "Get Current Profile",
  description: "Retrieve the website profile this connection's API key belongs to.",
  requiresAuth: true,
  params: [],
  output: [
    { key: "id", type: "string", label: "Profile ID (pfl_*)" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status (unverified/verified/blocked)" },
    { key: "website", type: "string", label: "Website" },
  ],

  async execute(_input, ctx) {
    return await new MollieClient(ctx).get("/profiles/me");
  },
};

export default profileGet;
