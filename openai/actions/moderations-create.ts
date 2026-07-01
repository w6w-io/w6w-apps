import type { ActionDefinition } from "@w6w/types";
import { OpenAIClient } from "../lib/client.ts";

interface Input {
  input: string | string[];
  model?: string;
}

const moderationsCreate: ActionDefinition<Input> = {
  key: "moderations-create",
  type: "perform",
  resource: "moderation",
  title: "Create Moderation",
  description: "Classify whether text violates OpenAI's usage policies.",
  params: [
    {
      key: "input",
      label: "Input",
      type: "text",
      required: true,
      hint: "Text to classify, or a JSON array of strings.",
    },
    {
      key: "model",
      label: "Model",
      type: "string",
      default: "omni-moderation-latest",
    },
  ],

  async execute(input, ctx) {
    const client = new OpenAIClient(ctx);
    const body: Record<string, unknown> = {
      input: input.input,
      model: input.model ?? "omni-moderation-latest",
    };

    return client.request("/moderations", { method: "POST", body });
  },
};

export default moderationsCreate;
