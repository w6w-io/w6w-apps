import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/**
 * `GET /persons/me` — the authenticated account's own profile.
 *
 * This is the same endpoint the `personal-access-token` and `oauth2` auth
 * methods use as their credential-liveness probe (see either file for why:
 * it requires a credential and returns no secret). Exposed here too since a
 * workflow routinely needs "who am I" as a plain read.
 */
const personMe: ActionDefinition<Record<string, never>> = {
  key: "person-me",
  type: "read",
  resource: "person",
  title: "Get Current Person",
  description: "Fetch the connected account's own profile.",
  params: [],
  output: [
    { key: "id", type: "number", label: "Person ID" },
    { key: "firstname", type: "string", label: "First name" },
    { key: "lastname", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "avatar", type: "string", label: "Avatar URL" },
  ],

  execute(_input, ctx) {
    return new MeisterTaskClient(ctx).request("/persons/me");
  },
};

export default personMe;
