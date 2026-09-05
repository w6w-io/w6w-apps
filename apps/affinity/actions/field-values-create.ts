import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, asFieldValue, compact } from "../lib/client.ts";

/**
 * `POST /field-values` — sets a value in one cell for a person, organization,
 * or opportunity.
 *
 * `value`'s required shape depends entirely on the target field's
 * `value_type` (see `fields-list` / the Field Value Types table): a plain
 * string for Text, a number for Number, `{street_address, city, state,
 * country}` for Location, a person/organization id for those types, or —
 * for a Ranked Dropdown field like the built-in Status column — the numeric
 * `id` of one of the field's own `dropdown_options`, never a typed string.
 * Because the shape varies, `value` is accepted as free-form JSON.
 */
interface Input {
  fieldId: number;
  entityId: number;
  value: unknown;
  listEntryId?: number;
}

const fieldValuesCreate: ActionDefinition<Input> = {
  key: "field-values-create",
  type: "perform",
  resource: "field-value",
  title: "Create Field Value",
  description: "Set a value in one cell (field) for a person, organization, or opportunity.",
  idempotent: false,
  params: [
    {
      key: "fieldId",
      label: "Field ID",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "From List Fields / List Global Person Fields / List Global Organization Fields.",
    },
    {
      key: "entityId",
      label: "Entity ID",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "The person, organization, or opportunity this value is being set on.",
    },
    {
      key: "value",
      label: "Value",
      type: "json",
      required: true,
      hint: "Shape depends on the field's value type — a dropdown option ID for Ranked Dropdown " +
        "fields, not a string. See the action description.",
    },
    {
      key: "listEntryId",
      label: "List Entry ID",
      type: "number",
      validation: { integer: true },
      hint: "Only set this when the field is list-specific rather than global.",
    },
  ],
  output: [{ key: "id", type: "number", label: "Field Value ID" }],

  execute(input, ctx) {
    return new AffinityClient(ctx).json("/field-values", {
      method: "POST",
      body: compact({
        field_id: input.fieldId,
        entity_id: input.entityId,
        value: asFieldValue(input.value, "value"),
        list_entry_id: input.listEntryId,
      }),
    });
  },
};

export default fieldValuesCreate;
