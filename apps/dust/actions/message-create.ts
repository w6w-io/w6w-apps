import type { ActionDefinition } from "@w6w/types";
import {
  AGENT_IDS_PARAM,
  buildContext,
  buildMentions,
  CONVERSATION_ID_PARAM,
} from "../lib/params.ts";
import { DustClient } from "../lib/client.ts";

/**
 * `POST /assistant/conversations/{cId}/messages` — verified against the
 * vendor's OpenAPI document ("Create a message"). Same `Message` request
 * body as Create Conversation's initial message, posted into an existing
 * conversation instead of starting a new one.
 *
 * ## The documented response schema cannot be the real response
 *
 * The reference document's `200` response for this endpoint re-uses the
 * request body's own `Message` schema (`content` + `mentions`, no `sId`,
 * `status`, or `created`) — the request and response are visibly not the
 * same shape, since a caller cannot know the created message's server-side
 * fields before creating it. Every other message-shaped object this app has
 * observed (`Conversation.content[][]`) carries `sId`/`status`/`created`
 * instead, so the true response almost certainly matches that shape — but
 * this app was not able to confirm it against a live conversation, so
 * `execute` returns the response body verbatim rather than asserting field
 * names the spec does not actually support. Use Get Conversation to read the
 * message back in its confirmed shape.
 *
 * Not idempotent — Dust documents no idempotency key for this endpoint, and
 * mentioning an agent triggers a new, separately-billed run each call.
 */
interface Input {
  cId: string;
  content: string;
  agentIds?: string;
  username: string;
  timezone: string;
  fullName?: string;
  email?: string;
}

const messageCreate: ActionDefinition<Input> = {
  key: "message-create",
  type: "perform",
  resource: "conversation",
  title: "Create Message",
  description: "Post a message into an existing conversation, optionally mentioning an agent.",
  idempotent: false,
  params: [
    CONVERSATION_ID_PARAM,
    { key: "content", label: "Message", type: "text", required: true },
    AGENT_IDS_PARAM,
    { key: "username", label: "Username", type: "string", required: true, default: "workflow" },
    { key: "timezone", label: "Timezone", type: "string", required: true, default: "UTC" },
    { key: "fullName", label: "Full name", type: "string", advanced: true },
    { key: "email", label: "Email", type: "string", advanced: true },
  ],
  output: [
    {
      key: "message",
      type: "object",
      label: "Created message (raw response — see the module doc for why this isn't typed further)",
    },
  ],

  execute(input, ctx) {
    ctx.log("info", "posting Dust message", { cId: input.cId });
    return new DustClient(ctx).json(
      `/assistant/conversations/${encodeURIComponent(input.cId)}/messages`,
      {
        method: "POST",
        body: {
          content: input.content,
          mentions: buildMentions(input.agentIds),
          context: buildContext(input),
        },
      },
    );
  },
};

export default messageCreate;
