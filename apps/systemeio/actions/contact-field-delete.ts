import type { ActionDefinition } from "@w6w/types";
import { SystemeClient } from "../lib/client.ts";

interface Input {
  slug: string;
}

const contactFieldDelete: ActionDefinition<Input> = {
  key: "contact-field-delete",
  type: "perform",
  resource: "contact-field",
  title: "Delete Contact Field",
  description: "Remove a custom ContactField definition.",
  idempotent: true,
  params: [
    { key: "slug", label: "Slug", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new SystemeClient(ctx).status(
      `/api/contact_fields/${encodeURIComponent(input.slug)}`,
    );
    return { status };
  },
};

export default contactFieldDelete;
