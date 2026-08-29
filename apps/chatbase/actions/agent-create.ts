import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient, compact } from "../lib/client.ts";
import { modelOptions } from "../lib/params.ts";

/**
 * `POST /agents` — creates an agent, optionally pre-training it from a
 * homepage URL. Training then runs asynchronously; `pendingSteps` in the
 * response lists anything that failed to kick off (e.g. the URL could not be
 * added as a source, or training could not start), so the create itself
 * still succeeds.
 */
interface Input {
  name: string;
  url?: string;
  instructions?: string;
  model?: string;
  temp?: number;
  visibility?: "public" | "private";
}

const agentCreate: ActionDefinition<Input> = {
  key: "agent-create",
  type: "perform",
  resource: "agent",
  title: "Create Agent",
  description: "Create a new agent. Provide a URL to pre-train it from that website automatically.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, validation: { maxLength: 100 } },
    {
      key: "url",
      label: "Homepage URL",
      type: "string",
      hint: "The agent is pre-configured to answer questions about this website, and a link " +
        "source is created and trained from it automatically.",
    },
    {
      key: "instructions",
      label: "Instructions",
      type: "text",
      hint: "System prompt for the agent.",
    },
    { key: "model", label: "Model", type: "select", options: modelOptions },
    {
      key: "temp",
      label: "Temperature",
      type: "number",
      validation: { min: 0, max: 1 },
      hint: "0–1. Leave empty to use the agent's default.",
    },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      options: [{ value: "public", label: "Public" }, { value: "private", label: "Private" }],
      default: "private",
    },
  ],
  output: [
    { key: "id", type: "string", label: "New agent ID" },
    { key: "pendingSteps", type: "array", label: "Steps that failed to start (absent if none)" },
  ],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).request("/agents", {
      method: "POST",
      body: compact({
        name: input.name,
        url: input.url,
        instructions: input.instructions,
        model: input.model,
        temp: input.temp,
        visibility: input.visibility,
      }),
    });
  },
};

export default agentCreate;
