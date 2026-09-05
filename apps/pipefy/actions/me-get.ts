import type { ActionDefinition } from "@w6w/types";
import { PipefyClient } from "../lib/client.ts";

type Input = Record<string, never>;

/**
 * `{ me { id name email username } }` — the exact query shown in Pipefy's
 * own Users doc. Needs no scope beyond "is logged in", so this doubles as
 * the safest possible manual credential check.
 */
const QUERY = `{ me { id name email username } }`;

const meGet: ActionDefinition<Input> = {
  key: "me-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Get the user (or Service Account) the connected Connection belongs to.",
  params: [],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
  ],

  async execute(_input, ctx) {
    const data = await new PipefyClient(ctx).send<{ me: Record<string, unknown> }>(QUERY);
    return data.me;
  },
};

export default meGet;
