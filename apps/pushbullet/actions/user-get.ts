import type { ActionDefinition } from "@w6w/types";
import { PushbulletClient } from "../lib/client.ts";

/**
 * `GET /v2/users/me` — the current user's profile. This is Pushbullet's only
 * documented account endpoint (see `auth/access-token.ts`, which reuses it as
 * the credential probe) and returns no secret material — no access token,
 * client secret or password field appears anywhere in the `User` object.
 */
const userGet: ActionDefinition<Record<string, never>> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Get the profile of the account this connection belongs to.",
  params: [],
  output: [
    { key: "iden", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "name", type: "string", label: "Name" },
    { key: "imageUrl", type: "string", label: "Image URL" },
    { key: "maxUploadSize", type: "number", label: "Max upload size (bytes)" },
  ],

  async execute(_input, ctx) {
    const body = await new PushbulletClient(ctx).json<Record<string, unknown>>("/users/me");
    return { ...body, imageUrl: body.image_url, maxUploadSize: body.max_upload_size };
  },
};

export default userGet;
