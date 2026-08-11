import type { ActionDefinition } from "@w6w/types";
import { EmailOctopusClient, seg } from "../lib/client.ts";

interface Input {
  listId: string;
  currentTag: string;
  label: string;
  tag: string;
  type: "text" | "number" | "date";
  fallback?: string | null;
}

/**
 * `PUT /lists/{list_id}/fields/{tag}`.
 *
 * Two asymmetries against `create-field`, both taken straight from the spec:
 *
 * 1. **`label`, `tag` and `type` are all required in the body.** This is a
 *    genuine replace, not a patch — omitting `label` on a rename wipes it.
 *    The `tag` in the PATH is the field's current name; the `tag` in the BODY
 *    is what it becomes, so this endpoint is also how a field is renamed.
 * 2. **`choices` is not part of the documented update body.** The request
 *    schema here is only the `text | number | date` variant (the *response* is
 *    still the two-variant `oneOf`), so the v2 spec provides no way to edit a
 *    choice field's options. This app therefore exposes no `choices` parameter
 *    on update rather than guessing at one; see the README.
 */
const updateField: ActionDefinition<Input> = {
  key: "update-field",
  type: "perform",
  resource: "field",
  title: "Update Field",
  description:
    "Update a custom field, addressed by its current tag. `label`, `tag` and `type` must all be supplied — the body replaces the definition rather than patching it.",
  idempotent: true,
  params: [
    {
      key: "listId",
      label: "List ID",
      type: "string",
      required: true,
      placeholder: "00000000-0000-0000-0000-000000000000",
    },
    {
      key: "currentTag",
      label: "Current tag",
      type: "string",
      required: true,
      hint: "The field's existing tag — this is the path segment, i.e. which field to update.",
    },
    { key: "label", label: "Label", type: "string", required: true },
    {
      key: "tag",
      label: "New tag",
      type: "string",
      required: true,
      hint:
        "The tag the field will have afterwards. Pass the same value as `currentTag` to keep it; a different one renames the field.",
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
      ],
      hint:
        "The v2 update body documents only these three. Choice fields' options cannot be edited through the API.",
    },
    { key: "fallback", label: "Fallback value", type: "string" },
  ],
  output: [
    { key: "label", type: "string", label: "Label" },
    { key: "tag", type: "string", label: "Tag" },
    { key: "type", type: "string", label: "Field type" },
    { key: "fallback", type: "string", label: "Fallback value" },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = {
      label: input.label,
      tag: input.tag,
      type: input.type,
    };
    if (input.fallback !== undefined) body.fallback = input.fallback;
    return new EmailOctopusClient(ctx).request(
      `/lists/${seg(input.listId)}/fields/${seg(input.currentTag)}`,
      { method: "PUT", body },
    );
  },
};

export default updateField;
