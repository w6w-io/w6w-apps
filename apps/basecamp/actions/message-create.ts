import type { ActionDefinition } from "@w6w/types";
import { BasecampClient, compact } from "../lib/client.ts";

/**
 * `POST /message_boards/{boardId}/messages.json` — post a message.
 *
 * ## A message is a draft unless you say otherwise
 *
 * `status` defaults to a draft on Basecamp's side. **Nothing is published and
 * nobody is notified until `status: "active"`** — which is why this action
 * defaults it to active and offers the draft explicitly. A workflow that posts
 * announcements and finds nobody saw them has almost always left this alone.
 *
 * `content` is rich text: Basecamp stores HTML, so markup is preserved.
 *
 * `category_id` is a message *type* (Announcement, FYI, Question…), and those
 * are per-project — the vendor's message-types endpoint is one of the few that
 * still needs the project-scoped route, which is why it is not shipped here.
 *
 * Not idempotent, and a repeat posts a second message to real people.
 */
interface Input {
  boardId: string;
  subject: string;
  content?: string;
  status?: string;
  categoryId?: string;
}

const messageCreate: ActionDefinition<Input> = {
  key: "message-create",
  type: "perform",
  resource: "message",
  title: "Create Message",
  description:
    "Post a message to a board. Published and notified by default — Basecamp would otherwise " +
    "save it as an unseen draft.",
  idempotent: false,
  params: [
    { key: "boardId", label: "Message board ID", type: "string", required: true },
    { key: "subject", label: "Subject", type: "string", required: true },
    {
      key: "content",
      label: "Content",
      type: "text",
      hint: "Rich text — Basecamp stores HTML here, so markup is preserved.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "active",
      options: [
        { value: "active", label: "Active — published and notified (default)" },
        { value: "draft", label: "Draft — saved, but nobody is told" },
      ],
      hint: "Basecamp's own default is a draft; this action publishes unless you choose otherwise.",
    },
    {
      key: "categoryId",
      label: "Category ID",
      type: "string",
      hint: "The message type (Announcement, FYI, Question…). Per-project.",
    },
  ],
  output: [{ key: "id", type: "number", label: "The created message's id" }],

  execute(input, ctx) {
    return new BasecampClient(ctx).request(
      `/message_boards/${encodeURIComponent(input.boardId)}/messages.json`,
      {
        method: "POST",
        body: compact({
          subject: input.subject,
          content: input.content,
          // Published unless the caller asked for a draft — see the module docs.
          status: input.status ?? "active",
          category_id: input.categoryId,
        }),
      },
    );
  },
};

export default messageCreate;
