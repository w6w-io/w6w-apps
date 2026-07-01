import type { ActionDefinition } from "@w6w/types";
import { OpenAIClient } from "../lib/client.ts";

interface Input {
  purpose?: string;
}

const filesList: ActionDefinition<Input> = {
  key: "files-list",
  type: "read",
  resource: "file",
  title: "List Files",
  description: "List uploaded files.",
  params: [
    {
      key: "purpose",
      label: "Purpose",
      type: "string",
      hint: "Filter by purpose (e.g. `fine-tune`, `assistants`).",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Files" },
    { key: "object", type: "string", label: "Object type" },
  ],

  async execute(input, ctx) {
    const client = new OpenAIClient(ctx);
    return client.request("/files", {
      query: { purpose: input.purpose },
    });
  },
};

export default filesList;
