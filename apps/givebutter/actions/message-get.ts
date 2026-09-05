import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient } from "../lib/client.ts";
import { numericIdParam } from "../lib/params.ts";

interface Input {
  id: string;
}

const messageGet: ActionDefinition<Input> = {
  key: "message-get",
  type: "read",
  resource: "message",
  title: "Get Message",
  description: "Fetch a single outbound message by its numeric id.",
  params: [numericIdParam("Message")],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "channel", type: "string", label: "Channel" },
    { key: "subject", type: "string", label: "Subject" },
  ],

  async execute(input, ctx) {
    return await new GivebutterClient(ctx).data(`/messages/${encodeURIComponent(input.id)}`);
  },
};

export default messageGet;
