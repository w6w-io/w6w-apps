import type { ActionDefinition } from "@w6w/types";
import { SystemeClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const newsletterGet: ActionDefinition<Input> = {
  key: "newsletter-get",
  type: "read",
  resource: "newsletter",
  title: "Get Newsletter",
  description: "Retrieve a single Newsletter resource by id, including its body.",
  params: [
    { key: "id", label: "Newsletter ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Newsletter ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "content", type: "object", label: "Content (subject, body, sender)" },
    { key: "state", type: "object", label: "State (isSent)" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).get(
      `/api/mailing/newsletters/${encodeURIComponent(input.id)}`,
    );
  },
};

export default newsletterGet;
