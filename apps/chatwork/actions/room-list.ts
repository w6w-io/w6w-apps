import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";

/** `GET /rooms` — every chat (group, direct and "my chat") the account belongs to. */
const roomList: ActionDefinition<Record<string, never>> = {
  key: "room-list",
  type: "read",
  resource: "room",
  title: "List Chats",
  description: "List every chat the connected account belongs to.",
  params: [],
  output: [
    { key: "room_id", type: "number", label: "Room ID" },
    { key: "name", type: "string", label: "Chat name" },
    { key: "type", type: "string", label: "my | direct | group" },
    { key: "role", type: "string", label: "My role: admin | member | readonly" },
    { key: "sticky", type: "boolean", label: "Pinned" },
    { key: "unread_num", type: "number", label: "Unread messages" },
    { key: "mention_num", type: "number", label: "Unread mentions of me" },
    { key: "mytask_num", type: "number", label: "My open tasks" },
    { key: "message_num", type: "number", label: "Total messages" },
    { key: "file_num", type: "number", label: "Total files" },
    { key: "task_num", type: "number", label: "Total tasks" },
    { key: "icon_path", type: "string", label: "Chat icon URL" },
    { key: "last_update_time", type: "number", label: "Last update (Unix seconds)" },
  ],

  execute(_input, ctx) {
    return new ChatworkClient(ctx).json("/rooms");
  },
};

export default roomList;
