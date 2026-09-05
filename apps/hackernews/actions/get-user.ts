import type { ActionDefinition } from "@w6w/types";
import { hnRequest, type User } from "../lib/client.ts";

/**
 * `GET /v0/user/{id}.json` — a user profile.
 *
 * The `id` is the case-sensitive username. Only users with public activity
 * (comments or story submissions) are reachable through the API, per the
 * README. A bogus username still answers `200 null` rather than a 404 (see
 * `lib/client.ts`'s module doc); this action returns that through unchanged.
 */
interface Input {
  id: string;
}

const getUser: ActionDefinition<Input, User | null> = {
  key: "get-user",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch a user's public profile by their case-sensitive username.",
  params: [
    {
      key: "id",
      label: "Username",
      type: "string",
      required: true,
      hint: "Case-sensitive. Only users with public comments or submissions are reachable.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Username" },
    { key: "created", type: "number", label: "Account created (Unix time)" },
    { key: "karma", type: "number", label: "Karma" },
    { key: "about", type: "string", label: "About (HTML)" },
    { key: "submitted", type: "array", label: "Ids of the user's stories, polls and comments" },
  ],

  execute(input, ctx) {
    return hnRequest<User | null>(ctx, `/user/${encodeURIComponent(input.id)}.json`);
  },
};

export default getUser;
