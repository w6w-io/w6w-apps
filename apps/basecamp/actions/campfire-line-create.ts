import type { ActionDefinition } from "@w6w/types";
import { BasecampClient, compact } from "../lib/client.ts";

/**
 * `POST /chats/{campfireId}/lines.json` — say something in a project's Campfire.
 *
 * This is the closest thing Basecamp has to a chat webhook, and it is the action
 * most workflows actually want: a build finished, a form came in, say so in the
 * room.
 *
 * The campfire id comes from the project's `dock`. `content` is rich text, so a
 * link or a bit of emphasis survives.
 *
 * Not idempotent: a repeat says it twice.
 */
interface Input {
  campfireId: string;
  content: string;
  contentType?: string;
}

const campfireLineCreate: ActionDefinition<Input> = {
  key: "campfire-line-create",
  type: "perform",
  resource: "campfire",
  title: "Post Campfire Message",
  description: "Say something in a project's Campfire chat room.",
  idempotent: false,
  params: [
    {
      key: "campfireId",
      label: "Campfire ID",
      type: "string",
      required: true,
      hint: "From the project's `dock`.",
    },
    {
      key: "content",
      label: "Message",
      type: "text",
      required: true,
      hint: "Rich text — a link or emphasis survives.",
    },
    {
      key: "contentType",
      label: "Content type",
      type: "string",
      hint: "Leave empty for Basecamp's default handling of the content.",
    },
  ],
  output: [{ key: "id", type: "number", label: "The created line's id" }],

  execute(input, ctx) {
    return new BasecampClient(ctx).request(
      `/chats/${encodeURIComponent(input.campfireId)}/lines.json`,
      {
        method: "POST",
        body: compact({ content: input.content, content_type: input.contentType }),
      },
    );
  },
};

export default campfireLineCreate;
