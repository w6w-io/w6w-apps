import type { ActionDefinition } from "@w6w/types";
import { MatrixClient, seg, userIdFromConnection } from "../lib/client.ts";

interface Input {
  displayName: string;
}

interface Output {
  updated: boolean;
}

/**
 * `PUT /_matrix/client/v3/profile/{userId}/displayname` — sets the connected
 * account's own display name. `userId` is the connection's own Matrix ID
 * (recorded by the Auth method's `afterConnect`), not a param: a homeserver
 * only lets an access token change that token's own profile ("Must be
 * authenticated with an access token authorised to make changes"), so asking
 * for a different user id here would only ever produce a 403.
 *
 * Written against the literal path `.../displayname` rather than the newer
 * `.../{keyName}` form the "latest" spec render documents since v1.16: with
 * `keyName` fixed to `displayname`, the two forms resolve to the identical
 * URL, so this also works unchanged against any pre-v1.16 homeserver that
 * only ever routed the fixed path. See the README for the full version note.
 */
const setDisplayName: ActionDefinition<Input, Output> = {
  key: "set-display-name",
  type: "perform",
  title: "Set Display Name",
  description: "Set the connected account's own display name.",
  idempotent: true,
  params: [
    { key: "displayName", label: "Display Name", type: "string", required: true },
  ],
  output: [{ key: "updated", type: "boolean", label: "Updated" }],

  async execute(input, ctx) {
    const client = new MatrixClient(ctx);
    const userId = userIdFromConnection(ctx.connection);
    await client.request(`/profile/${seg(userId)}/displayname`, {
      method: "PUT",
      body: { displayname: input.displayName },
    });
    return { updated: true };
  },
};

export default setDisplayName;
