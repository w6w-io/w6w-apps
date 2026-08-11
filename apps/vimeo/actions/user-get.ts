import type { ActionDefinition } from "@w6w/types";
import { idFromRef, toCsv, VimeoClient } from "../lib/client.ts";
import { fieldsParam } from "../lib/params.ts";

/**
 * `GET /me` — the connected account, or `GET /users/{user_id}` for someone else.
 *
 * `/me` is the documented alias of `GET /users/{user_id}`
 * (`x-mill-path-aliases: ["/me"]`) and is the only endpoint that *requires* an
 * authenticated, user-bound token: the authentication guide says accessing
 * `/me` with an unauthenticated (client-credentials) token is an error. That
 * property is what makes it this app's credential probe.
 *
 * ## Read `Fields` before running this without one
 *
 * The user representation has 229 documented fields, two of which are cleartext
 * secrets returned by default:
 *
 *  - `preferences.videos.password` — "The password for viewing the
 *    authenticated user's videos."
 *  - `preferences.videos.privacy.password` — "The default password for the
 *    video."
 *
 * Nothing here strips them: they are the caller's own data and quietly deleting
 * a field the vendor returned would be its own surprise. But a workflow that
 * pipes this into a log or a message should set `Fields` — Vimeo's own
 * supported filter — and get back only what it asked for. `uri,name,link` is
 * usually the whole answer.
 */
interface Input {
  userId?: string;
  fields?: string;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch the connected Vimeo account, or another user by ID.",
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "string",
      placeholder: "152184",
      hint: "Leave blank for the connected account (`/me`). A `/users/152184` URI also works.",
    },
    fieldsParam,
  ],
  output: [
    { key: "uri", type: "string", label: "The user's canonical URI" },
    { key: "name", type: "string", label: "Display name" },
    { key: "link", type: "string", label: "Profile URL" },
  ],

  execute(input, ctx) {
    const path = input.userId ? `/users/${idFromRef(input.userId, "User ID")}` : "/me";
    return new VimeoClient(ctx).request(path, { query: { fields: toCsv(input.fields) } });
  },
};

export default userGet;
