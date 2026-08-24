import type { ActionDefinition } from "@w6w/types";
import { compact, RetellClient } from "../lib/client.ts";

/**
 * `POST /v2/create-web-call` — start a browser/WebRTC call session with an agent.
 *
 * The response includes an `access_token` a client-side Retell Web SDK uses
 * to actually join the call's audio — this action only creates the session
 * server-side; playing the audio is the caller's own frontend's job.
 *
 * `agent_version` accepts a numeric version (`3`), a tag/environment name
 * (`"prod"`), or the literals `"latest"` / `"latest_published"` — verified
 * against the `AgentVersionReference` schema. Left as a plain string param
 * rather than a number, since a tag is a valid value.
 */
interface Input {
  agentId: string;
  agentVersion?: string;
  metadata?: Record<string, unknown>;
  dynamicVariables?: Record<string, string>;
  currentNodeId?: string;
  currentState?: string;
}

interface Output {
  call_id: string;
  agent_id: string;
  call_status: string;
  access_token: string;
  [key: string]: unknown;
}

const createWebCall: ActionDefinition<Input, Output> = {
  key: "create-web-call",
  type: "perform",
  resource: "call",
  title: "Create Web Call",
  description: "Start a browser-based call session with an agent, returning a client access token.",
  idempotent: false,
  params: [
    {
      key: "agentId",
      label: "Agent ID",
      type: "string",
      required: true,
      hint: "The agent to use. Its Response Engine's LLM websocket handles the call.",
    },
    {
      key: "agentVersion",
      label: "Agent version",
      type: "string",
      hint: 'A numeric version ("3"), a tag ("prod"), "latest", or "latest_published". Leave ' +
        "empty to use whatever version is bound to the agent by default.",
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      hint: "Arbitrary object stored on the call for your own reference. Not used for processing.",
    },
    {
      key: "dynamicVariables",
      label: "Dynamic variables",
      type: "json",
      hint: "String key/value pairs injected into the agent's prompt and tool descriptions, " +
        'e.g. {"customer_name": "John Doe"}. Response Engine agents only.',
    },
    {
      key: "currentNodeId",
      label: "Start at conversation-flow node",
      type: "string",
      hint: "Only applies to agents using a conversation flow as the Response Engine.",
    },
    {
      key: "currentState",
      label: "Start in Retell LLM state",
      type: "string",
      hint: "Only applies to Retell LLM agents that use states.",
    },
  ],
  output: [
    { key: "call_id", type: "string", label: "Call ID" },
    { key: "agent_id", type: "string", label: "Agent ID" },
    { key: "call_status", type: "string", label: "Call status" },
    { key: "access_token", type: "string", label: "Client access token" },
  ],

  execute(input, ctx) {
    return new RetellClient(ctx).request<Output>("/v2/create-web-call", {
      method: "POST",
      body: compact({
        agent_id: input.agentId,
        agent_version: input.agentVersion,
        metadata: input.metadata,
        retell_llm_dynamic_variables: input.dynamicVariables,
        current_node_id: input.currentNodeId,
        current_state: input.currentState,
      }),
    });
  },
};

export default createWebCall;
