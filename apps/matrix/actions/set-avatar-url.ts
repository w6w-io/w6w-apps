import type { ActionDefinition } from "@w6w/types";
import { MatrixClient, seg, userIdFromConnection } from "../lib/client.ts";

interface Input {
  avatarUrl: string;
}

interface Output {
  updated: boolean;
}

/**
 * `PUT /_matrix/client/v3/profile/{userId}/avatar_url` — sets the connected
 * account's own avatar, taking an already-uploaded `mxc://` content URI
 * (Matrix's own media reference scheme). Uploading the image bytes themselves
 * is `POST /_matrix/media/v3/upload`, a separate content-repository endpoint
 * outside this app's Client-Server messaging/rooms/profile scope — left out
 * deliberately rather than half-implemented; see the README.
 *
 * Same `userId`-from-Connection and literal-path reasoning as
 * `set-display-name.ts`.
 */
const setAvatarUrl: ActionDefinition<Input, Output> = {
  key: "set-avatar-url",
  type: "perform",
  title: "Set Avatar",
  description: "Set the connected account's own avatar from an already-uploaded mxc:// URI.",
  idempotent: true,
  params: [
    {
      key: "avatarUrl",
      label: "Avatar URL",
      type: "string",
      required: true,
      placeholder: "mxc://matrix.org/SDGdghriugerRg",
      hint: "A Matrix content URI (mxc://...) for an already-uploaded image.",
    },
  ],
  output: [{ key: "updated", type: "boolean", label: "Updated" }],

  async execute(input, ctx) {
    const client = new MatrixClient(ctx);
    const userId = userIdFromConnection(ctx.connection);
    await client.request(`/profile/${seg(userId)}/avatar_url`, {
      method: "PUT",
      body: { avatar_url: input.avatarUrl },
    });
    return { updated: true };
  },
};

export default setAvatarUrl;
