import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, compact } from "../lib/client.ts";
import { fieldEntityTypeOptions, fieldValueTypeOptions } from "../lib/params.ts";

/**
 * `GET /fields` — global and list-specific fields (columns), optionally
 * scoped to one list, value type, or entity type. No pagination; a bare
 * array.
 */
interface Input {
  listId?: number;
  valueType?: number;
  entityType?: number;
  withModifiedNames?: boolean;
  excludeDropdownOptions?: boolean;
}

const fieldsList: ActionDefinition<Input> = {
  key: "fields-list",
  type: "read",
  resource: "field",
  title: "List Fields",
  description: "Get global and/or list-specific fields, optionally filtered by list or type.",
  params: [
    {
      key: "listId",
      label: "List ID",
      type: "number",
      validation: { integer: true },
      hint: "Only fields specific to this list. Leave empty to include global fields too.",
    },
    {
      key: "valueType",
      label: "Value type",
      type: "select",
      options: fieldValueTypeOptions,
    },
    {
      key: "entityType",
      label: "Entity type",
      type: "select",
      options: fieldEntityTypeOptions,
    },
    {
      key: "withModifiedNames",
      label: "Prefix names with list name",
      type: "boolean",
      hint: 'Returns names as "[List Name] Field Name".',
    },
    {
      key: "excludeDropdownOptions",
      label: "Exclude dropdown options",
      type: "boolean",
      hint: "Useful when a field has many dropdown options and the payload is too large.",
    },
  ],
  output: [{ key: "fields", type: "array", label: "Fields" }],

  execute(input, ctx) {
    return new AffinityClient(ctx).json("/fields", {
      query: compact({
        list_id: input.listId,
        value_type: input.valueType,
        entity_type: input.entityType,
        with_modified_names: input.withModifiedNames,
        exclude_dropdown_options: input.excludeDropdownOptions,
      }),
    });
  },
};

export default fieldsList;
