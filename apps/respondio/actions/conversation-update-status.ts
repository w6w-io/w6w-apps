import type { ActionDefinition } from "@w6w/types";
import { assertIdentifier, compact, RespondioClient } from "../lib/client.ts";
import { conversationStatusOptions } from "../lib/params.ts";

/**
 * `POST /contact/{identifier}/conversation/status` — `ConversationClient.updateStatus`
 * in the official SDK. `category`/`summary` are documented as accompanying a
 * "close" (a closing-note category and free-text summary); this action only
 * shows them once "Close" is selected.
 */
interface Input {
  identifier: string;
  status: "open" | "close";
  category?: string;
  summary?: string;
}

const conversationUpdateStatus: ActionDefinition<Input> = {
  key: "conversation-update-status",
  type: "perform",
  resource: "conversation",
  title: "Open Or Close Conversation",
  description: "Open or close a contact's conversation, optionally with a closing note.",
  idempotent: true,
  params: [
    { key: "identifier", label: "Contact identifier", type: "string", required: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: conversationStatusOptions,
    },
    {
      key: "category",
      label: "Closing note category",
      type: "string",
      showIf: { "==": [{ var: "status" }, "close"] },
      hint: "See Space: List Closing Notes for this workspace's categories.",
    },
    {
      key: "summary",
      label: "Closing note summary",
      type: "text",
      showIf: { "==": [{ var: "status" }, "close"] },
    },
  ],
  output: [{ key: "contactId", type: "number", label: "Contact ID" }],

  execute(input, ctx) {
    const identifier = assertIdentifier(input.identifier);
    return new RespondioClient(ctx).post(
      `/contact/${identifier}/conversation/status`,
      compact({ status: input.status, category: input.category, summary: input.summary }),
    );
  },
};

export default conversationUpdateStatus;
