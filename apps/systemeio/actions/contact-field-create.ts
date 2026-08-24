import type { ActionDefinition } from "@w6w/types";
import { SystemeClient } from "../lib/client.ts";

interface Input {
  fieldName: string;
  slug: string;
}

/**
 * `POST /api/contact_fields`.
 *
 * `slug` must match `^(\w+)$` (word characters only — no hyphens or spaces) per
 * the OpenAPI schema's `pattern`, which is why the hint spells that out rather
 * than leaving it to trial and error against a 422.
 */
const contactFieldCreate: ActionDefinition<Input> = {
  key: "contact-field-create",
  type: "perform",
  resource: "contact-field",
  title: "Create Contact Field",
  description: "Create a custom ContactField definition.",
  idempotent: false,
  params: [
    {
      key: "fieldName",
      label: "Field name",
      type: "string",
      required: true,
      validation: { maxLength: 255 },
    },
    {
      key: "slug",
      label: "Slug",
      type: "string",
      required: true,
      validation: { pattern: "^(\\w+)$" },
      hint: "Word characters only (letters, digits, underscore) — no hyphens or spaces.",
    },
  ],
  output: [
    { key: "slug", type: "string", label: "Slug" },
    { key: "fieldName", type: "string", label: "Field name" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).post("/api/contact_fields", {
      fieldName: input.fieldName,
      slug: input.slug,
    });
  },
};

export default contactFieldCreate;
