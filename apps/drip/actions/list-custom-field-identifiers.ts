import type { ActionDefinition } from "@w6w/types";
import { DripClient } from "../lib/client.ts";

const listCustomFieldIdentifiers: ActionDefinition<Record<string, never>> = {
  key: "list-custom-field-identifiers",
  type: "read",
  resource: "custom-field",
  title: "List Custom Field Identifiers",
  description: "List every active custom field identifier used in this account.",
  params: [],
  output: [{ key: "customFieldIdentifiers", type: "array", label: "Custom field identifiers" }],

  async execute(_input, ctx) {
    const body = await new DripClient(ctx).request<{ custom_field_identifiers?: string[] }>(
      "/custom_field_identifiers",
    );
    return { customFieldIdentifiers: body.custom_field_identifiers ?? [] };
  },
};

export default listCustomFieldIdentifiers;
