import type { ActionDefinition } from "@w6w/types";
import { MotionClient, V1 } from "../lib/client.ts";

/**
 * `GET /v1/users/me` — the owner of this API key.
 *
 * Returns `{id, name, email}` and nothing else — no token, no key, no secret of
 * any kind. That was read off the response schema rather than inferred from the
 * endpoint's name, which is the same discipline that keeps Mailjet's `/apikey`,
 * Follow Up Boss's `/me` and ElevenLabs' `/v1/user` out of this pack's probes:
 * a whoami is only safe when its schema says it is.
 *
 * Because it is safe and cheap, it doubles as the credential probe
 * (`auth/api-key.ts`) and as the unsigned reachability probe
 * (`health/api.ts`). Its `id` is also the value to pass as `assigneeId` when a
 * workflow assigns work to whoever owns the connection.
 */
type Input = Record<string, never>;

const userGetMe: ActionDefinition<Input> = {
  key: "user-get-me",
  type: "read",
  resource: "user",
  title: "Get My User",
  description:
    "Fetch the user who owns this API key. Its `id` is the assigneeId for assigning work to the " +
    "connection's own owner.",
  params: [],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
  ],

  execute(_input, ctx) {
    return new MotionClient(ctx).json(`${V1}/users/me`);
  },
};

export default userGetMe;
