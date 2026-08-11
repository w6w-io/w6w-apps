import type { ActionDefinition } from "@w6w/types";
import { EmailOctopusClient, seg } from "../lib/client.ts";

interface Input {
  listId: string;
  label: string;
  tag: string;
  type: "text" | "number" | "date" | "choice_single" | "choice_multiple";
  choices?: string[];
  fallback?: string | null;
}

/**
 * `POST /lists/{list_id}/fields` — 201 with the new field.
 *
 * The request body is a `oneOf` of two variants and the discriminator is
 * `type`:
 *
 *   - `text` | `number` | `date`                 → `{ label, tag, type, fallback? }`
 *   - `choice_single` | `choice_multiple`        → the same plus `choices[]`
 *
 * So `choices` is sent only for the two choice types. Sending it alongside
 * `text` does not match either branch.
 *
 * `tag` is the machine name used in campaign merge syntax and as the key in a
 * contact's `fields` object — it is not a display label, and it is what every
 * other endpoint addresses the field by.
 */
const createField: ActionDefinition<Input> = {
  key: "create-field",
  type: "perform",
  resource: "field",
  title: "Create Field",
  description:
    "Define a custom field on a list. `tag` is the machine name used in merge syntax and as the key inside a contact's `fields` object.",
  idempotent: false,
  params: [
    {
      key: "listId",
      label: "List ID",
      type: "string",
      required: true,
      placeholder: "00000000-0000-0000-0000-000000000000",
    },
    {
      key: "label",
      label: "Label",
      type: "string",
      required: true,
      placeholder: "What is your hometown?",
      hint: "Human-readable, shown on forms.",
    },
    {
      key: "tag",
      label: "Tag",
      type: "string",
      required: true,
      placeholder: "Hometown",
      hint: "The machine name. This is the key you set in a contact's `fields` object.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { value: "text", label: "Text" },
        { value: "number", label: "Number" },
        { value: "date", label: "Date" },
        { value: "choice_single", label: "Single choice" },
        { value: "choice_multiple", label: "Multiple choice" },
      ],
    },
    {
      key: "choices",
      label: "Choices",
      type: "json",
      hint:
        'JSON array of strings — `["One", "Two"]`. Only valid for `choice_single` and `choice_multiple`; ignored otherwise.',
    },
    {
      key: "fallback",
      label: "Fallback value",
      type: "string",
      hint: "Substituted in a campaign when a contact has no value for this field.",
    },
  ],
  output: [
    { key: "label", type: "string", label: "Label" },
    { key: "tag", type: "string", label: "Tag" },
    { key: "type", type: "string", label: "Field type" },
    { key: "choices", type: "array", label: "Choices (choice fields only)" },
    { key: "fallback", type: "string", label: "Fallback value" },
  ],

  execute(input, ctx) {
    const isChoice = input.type === "choice_single" || input.type === "choice_multiple";
    const body: Record<string, unknown> = {
      label: input.label,
      tag: input.tag,
      type: input.type,
    };
    if (isChoice && input.choices !== undefined) body.choices = input.choices;
    if (input.fallback !== undefined) body.fallback = input.fallback;
    return new EmailOctopusClient(ctx).request(`/lists/${seg(input.listId)}/fields`, {
      method: "POST",
      body,
    });
  },
};

export default createField;
