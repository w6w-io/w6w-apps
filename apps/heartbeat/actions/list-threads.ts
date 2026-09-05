import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `GET /v0/channels/{channelID}/threads` — the 20 most recent threads in a channel. */
interface Input {
  channelID: string;
}

const listThreads: ActionDefinition<Input> = {
  key: "list-threads",
  type: "read",
  resource: "thread",
  title: "List Threads in Channel",
  description: "Return the 20 most recent threads in a channel. Not paginated beyond that.",
  params: [{ key: "channelID", label: "Channel ID", type: "string", required: true }],
  output: [{ key: "threads", type: "array", label: "Threads (up to 20, newest first)" }],

  async execute(input, ctx) {
    const threads = await new HeartbeatClient(ctx).json(
      `/channels/${encodeURIComponent(input.channelID)}/threads`,
    );
    return { threads };
  },
};

export default listThreads;
