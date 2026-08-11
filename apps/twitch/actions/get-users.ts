import type { ActionDefinition } from "@w6w/types";
import { toList, TwitchClient } from "../lib/client.ts";

/**
 * `GET /helix/users` — Get Users.
 *
 * The action every other action in this app starts from: Twitch addresses
 * broadcasters by numeric user id everywhere except here, and this is the only
 * endpoint that turns a login name into one.
 *
 * Two details from the reference that a caller has to know:
 *
 *  - **`id` and `login` are repeated keys**, and their combined count may not
 *    exceed 100. `id=1&id=2` — never `id=1,2`, which Twitch reads as one
 *    nonexistent user and answers with an empty list rather than an error.
 *  - **Omitting both is legal only for a user access token**, in which case the
 *    response describes the token's own user. With an app access token it is a
 *    400: "The id or login query parameter is required unless the request uses a
 *    user access token." Neither param is marked required for exactly that
 *    reason.
 *
 * `email` is present only when the user access token carries `user:read:email`,
 * and then only for the user who consented — every other user in a multi-id
 * response has an empty one.
 */
interface Input {
  id?: string[] | string;
  login?: string[] | string;
}

const getUsers: ActionDefinition<Input> = {
  key: "get-users",
  type: "read",
  title: "Get Users",
  description:
    "Look up Twitch users by ID or login name. Leave both empty with a user access token to get " +
    "the token's own user. Works with an app access token when at least one ID or login is given.",
  resource: "user",
  params: [
    {
      key: "id",
      label: "User IDs",
      type: "string",
      placeholder: "141981764",
      hint: "One or more numeric user IDs, comma-separated. Combined with logins, at most 100.",
    },
    {
      key: "login",
      label: "Login names",
      type: "string",
      placeholder: "twitchdev",
      hint: "One or more login names (the lowercase name in the channel URL), comma-separated. " +
        "Combined with IDs, at most 100.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Users" },
    { key: "data[].id", type: "string", label: "User ID" },
    { key: "data[].login", type: "string", label: "Login name" },
    { key: "data[].display_name", type: "string", label: "Display name" },
    { key: "data[].broadcaster_type", type: "string", label: 'affiliate | partner | ""' },
    { key: "data[].description", type: "string", label: "Channel description" },
    { key: "data[].profile_image_url", type: "string", label: "Profile image URL" },
    { key: "data[].created_at", type: "string", label: "Account created (RFC3339)" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "twitch: get users");
    return await new TwitchClient(ctx).get("/users", {
      id: toList(input.id),
      login: toList(input.login),
    });
  },
};

export default getUsers;
