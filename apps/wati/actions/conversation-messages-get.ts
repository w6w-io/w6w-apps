import type { ActionDefinition } from "@w6w/types";
import { WatiClient } from "../lib/client.ts";
import { CONVERSATION_TARGET_PARAM, PAGE_NUMBER_PARAM, PAGE_SIZE_PARAM } from "../lib/params.ts";

interface Input {
  target: string;
  pageNumber: number;
  pageSize: number;
}

interface ConversationEventDto {
  id?: string;
  text?: string;
  type?: string;
  timestamp?: string;
  owner?: boolean;
  status?: string;
  local_message_id?: string;
  conversation_id?: string;
}

interface GetMessagesByConversationIdResponse {
  message_list?: ConversationEventDto[];
  page_number: number;
  page_size: number;
}

/**
 * `GET /api/ext/v3/conversations/{target}/messages` — verified against the embedded OpenAPI
 * document 2026-09-05. `target` additionally accepts a ConversationId or a BSUID (unlike the
 * contact-scoped endpoints, which do not).
 */
const action: ActionDefinition<Input, GetMessagesByConversationIdResponse> = {
  key: "conversation-messages-get",
  type: "read",
  resource: "conversations",
  title: "Get Conversation Messages",
  description: "List messages in a conversation, paginated.",
  params: [
    { ...CONVERSATION_TARGET_PARAM },
    PAGE_NUMBER_PARAM,
    PAGE_SIZE_PARAM,
  ],
  output: [
    { key: "message_list", label: "Messages", type: "array" },
    { key: "page_number", label: "Page Number", type: "number" },
    { key: "page_size", label: "Page Size", type: "number" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "getting Wati conversation messages", { target: input.target });
    return await new WatiClient(ctx).get<GetMessagesByConversationIdResponse>(
      `/conversations/${encodeURIComponent(input.target)}/messages`,
      { page_number: input.pageNumber, page_size: input.pageSize },
    );
  },
};

export default action;
