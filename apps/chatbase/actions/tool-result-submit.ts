import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, ChatbaseClient } from "../lib/client.ts";
import { agentIdParam, conversationIdParam } from "../lib/params.ts";

/**
 * `POST /agents/{agentId}/conversations/{conversationId}/tool-result` —
 * submits the result of a client-side action (a "tool call") the agent
 * invoked, identified by the `toolCallId` from the chat response's
 * `tool-call` part. After this, call Chat With Agent again with `message`
 * omitted to let the agent continue from the result.
 */
interface Input {
  agentId: string;
  conversationId: string;
  toolCallId: string;
  output?: unknown;
}

const toolResultSubmit: ActionDefinition<Input> = {
  key: "tool-result-submit",
  type: "perform",
  resource: "conversation",
  title: "Submit Tool Result",
  description:
    "Submit the result of a client-side action the agent invoked. Continue the conversation " +
    "afterward with Chat With Agent (message omitted).",
  idempotent: false,
  params: [
    agentIdParam,
    conversationIdParam,
    {
      key: "toolCallId",
      label: "Tool Call ID",
      type: "string",
      required: true,
      hint: "From the tool-call part in the chat response that requested this action.",
    },
    {
      key: "output",
      label: "Result",
      type: "json",
      hint: "The result of executing the client action. Any JSON value.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Whether the result was recorded" }],

  execute(input, ctx) {
    const output = asOptionalJson(input.output, "output");
    const body: Record<string, unknown> = { toolCallId: input.toolCallId };
    if (output !== undefined) body.output = output;
    return new ChatbaseClient(ctx).unwrap(
      `/agents/${encodeURIComponent(input.agentId)}/conversations/` +
        `${encodeURIComponent(input.conversationId)}/tool-result`,
      { method: "POST", body },
    );
  },
};

export default toolResultSubmit;
