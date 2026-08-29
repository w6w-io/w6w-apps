import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";

/** `GET /my/status` — unread/mention/task counters across every chat. */
const myStatusGet: ActionDefinition<Record<string, never>> = {
  key: "my-status-get",
  type: "read",
  resource: "profile",
  title: "Get My Status",
  description: "Fetch unread-message, mention and my-task counters across all of your chats.",
  params: [],
  output: [
    { key: "unread_room_num", type: "number", label: "Chats with unread messages" },
    { key: "mention_room_num", type: "number", label: "Chats with unread mentions of me" },
    { key: "mytask_room_num", type: "number", label: "Chats where I have a task" },
    { key: "unread_num", type: "number", label: "Total unread messages" },
    { key: "mention_num", type: "number", label: "Total unread mentions of me" },
    { key: "mytask_num", type: "number", label: "Total tasks assigned to me" },
  ],

  execute(_input, ctx) {
    return new ChatworkClient(ctx).json("/my/status");
  },
};

export default myStatusGet;
