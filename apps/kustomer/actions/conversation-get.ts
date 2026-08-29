import type { ActionDefinition } from "@w6w/types";
import { KustomerClient } from "../lib/client.ts";
import { recordOutput } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `GET /v1/conversations/{id}` — verified against the Core Resources OAS. */
const conversationGet: ActionDefinition<Input> = {
  key: "conversation-get",
  type: "read",
  resource: "conversation",
  title: "Get Conversation",
  description: "Fetch one conversation by its Kustomer ID.",
  params: [{ key: "id", label: "Conversation ID", type: "string", required: true }],
  output: recordOutput,

  execute(input, ctx) {
    return new KustomerClient(ctx).data(`/conversations/${encodeURIComponent(input.id)}`);
  },
};

export default conversationGet;
