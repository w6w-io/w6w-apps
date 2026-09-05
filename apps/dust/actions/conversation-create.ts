import type { ActionDefinition } from "@w6w/types";
import { DustClient } from "../lib/client.ts";
import { AGENT_IDS_PARAM, buildContext, buildMentions, type ContextInput } from "../lib/params.ts";

/**
 * `POST /assistant/conversations` — verified against the vendor's OpenAPI
 * document ("Create a new conversation").
 *
 * ## `blocking` is the one param that changes everything about the shape of the work
 *
 * `blocking: false` (the vendor's documented default) returns the moment the
 * conversation exists — the mentioned agent has not necessarily answered yet.
 * `blocking: true` holds the HTTP response open until the agent's first
 * answer completes, which is what makes a *single* action call usable inside
 * a workflow instead of requiring a poll loop against Get Conversation. This
 * app defaults it to `true` for that reason, opposite the vendor's own API
 * default, and says so.
 *
 * Not idempotent: every call starts a new conversation (and, with
 * `mentions` non-empty, a new billed agent run) — there is no idempotency
 * key documented for this endpoint.
 */
interface Input extends ContextInput {
  content: string;
  agentIds?: string;
  title?: string;
  blocking?: boolean;
  spaceId?: string;
  skipToolsValidation?: boolean;
}

const conversationCreate: ActionDefinition<Input> = {
  key: "conversation-create",
  type: "perform",
  resource: "conversation",
  title: "Create Conversation",
  description: "Start a new conversation with an initial message, optionally mentioning an agent.",
  idempotent: false,
  params: [
    { key: "content", label: "Message", type: "text", required: true },
    AGENT_IDS_PARAM,
    { key: "title", label: "Title", type: "string" },
    {
      key: "blocking",
      label: "Wait for the agent's first answer",
      type: "boolean",
      default: true,
      hint: "If off, this returns the conversation immediately and the agent may still be " +
        "generating — use Get Conversation to poll for the answer.",
    },
    {
      key: "spaceId",
      label: "Space ID",
      type: "string",
      advanced: true,
      hint: "Create inside a specific space (project) rather than outside any project.",
    },
    {
      key: "skipToolsValidation",
      label: "Skip tool-use approval",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Skip the human-approval step for any tool the mentioned agent's message triggers.",
    },
    { key: "username", label: "Username", type: "string", required: true, default: "workflow" },
    { key: "timezone", label: "Timezone", type: "string", required: true, default: "UTC" },
    { key: "fullName", label: "Full name", type: "string", advanced: true },
    { key: "email", label: "Email", type: "string", advanced: true },
  ],
  output: [{ key: "conversation", type: "object", label: "Created conversation" }],

  execute(input, ctx) {
    ctx.log("info", "creating Dust conversation", { blocking: input.blocking !== false });
    return new DustClient(ctx).json("/assistant/conversations", {
      method: "POST",
      body: {
        title: input.title,
        blocking: input.blocking !== false,
        spaceId: input.spaceId || undefined,
        skipToolsValidation: input.skipToolsValidation,
        message: {
          content: input.content,
          mentions: buildMentions(input.agentIds),
          context: buildContext(input),
        },
      },
    });
  },
};

export default conversationCreate;
