import type { ActionDefinition } from "@w6w/types";
import { SystemeClient } from "../lib/client.ts";

interface Input {
  slug: string;
  fieldName: string;
}

/** `PATCH /api/contact_fields/{slug}` — merge-patch. `fieldName` is required by the schema. */
const contactFieldUpdate: ActionDefinition<Input> = {
  key: "contact-field-update",
  type: "perform",
  resource: "contact-field",
  title: "Update Contact Field",
  description: "Rename a custom ContactField definition. The slug itself cannot be changed.",
  idempotent: true,
  params: [
    { key: "slug", label: "Slug", type: "string", required: true },
    {
      key: "fieldName",
      label: "Field name",
      type: "string",
      required: true,
      validation: { maxLength: 255 },
    },
  ],
  output: [
    { key: "slug", type: "string", label: "Slug" },
    { key: "fieldName", type: "string", label: "Field name" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).patch(
      `/api/contact_fields/${encodeURIComponent(input.slug)}`,
      { fieldName: input.fieldName },
    );
  },
};

export default contactFieldUpdate;
