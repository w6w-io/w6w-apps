import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `GET /v0/threads/{threadID}` — a single thread, with its comments. */
interface Input {
  threadID: string;
}

const getThread: ActionDefinition<Input> = {
  key: "get-thread",
  type: "read",
  resource: "thread",
  title: "Get Thread",
  description: "Fetch a single thread, including its comments.",
  params: [{ key: "threadID", label: "Thread ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Thread ID" },
    { key: "channelID", type: "string", label: "Channel ID" },
    { key: "userID", type: "string", label: "Author user ID" },
    { key: "content", type: "string", label: "Content (rich-text HTML)" },
    { key: "files", type: "array", label: "File attachment URLs" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "url", type: "string", label: "URL to this thread" },
    { key: "comments", type: "array", label: "Comments (and their replies)" },
  ],

  execute(input, ctx) {
    return new HeartbeatClient(ctx).json(`/threads/${encodeURIComponent(input.threadID)}`);
  },
};

export default getThread;
