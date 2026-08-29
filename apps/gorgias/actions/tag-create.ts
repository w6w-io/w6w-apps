import type { ActionDefinition } from "@w6w/types";
import { GorgiasClient, unset } from "../lib/client.ts";

interface Input {
  name: string;
  description?: string;
  color?: string;
}

const tagOutput = [
  { key: "id", type: "number" as const, label: "Tag ID" },
  { key: "name", type: "string" as const, label: "Name" },
  { key: "description", type: "string" as const, label: "Description" },
];

/** `POST /tags` — verified against developers.gorgias.com/reference/create-tag. */
const tagCreate: ActionDefinition<Input> = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  title: "Create Tag",
  description: "Create a tag that can be attached to tickets.",
  // Gorgias has no create-or-update endpoint to converge a retry on, and a
  // duplicate name is rejected rather than merged.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, hint: "Case sensitive." },
    { key: "description", label: "Description", type: "string" },
    {
      key: "color",
      label: "Color",
      type: "string",
      advanced: true,
      placeholder: "#F58D86",
      hint: "Hex color code for the tag's decoration.",
    },
  ],
  output: tagOutput,

  execute(input, ctx) {
    return new GorgiasClient(ctx).request("/tags", {
      method: "POST",
      body: {
        name: input.name,
        description: unset(input.description),
        decoration: unset(input.color) ? { color: input.color } : undefined,
      },
    });
  },
};

export default tagCreate;
