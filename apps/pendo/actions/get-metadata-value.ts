import type { ActionDefinition } from "@w6w/types";
import { PendoClient } from "../lib/client.ts";

/** `GET /api/v1/metadata/:kind/:group/value/:id/:fieldName` — read one metadata field. */
const action: ActionDefinition = {
  key: "get-metadata-value",
  type: "read",
  resource: "metadata",
  title: "Get Metadata Value",
  description: "Read the value of one metadata field on a single visitor or account.",
  params: [
    {
      key: "kind",
      label: "Kind",
      type: "select",
      required: true,
      options: [
        { value: "visitor", label: "Visitor" },
        { value: "account", label: "Account" },
      ],
    },
    {
      key: "group",
      label: "Field Group",
      type: "string",
      required: true,
      default: "custom",
      hint: 'Origin of the field: "custom", "agent", "salesforce", etc. — as shown on ' +
        "Data Mappings.",
    },
    {
      key: "id",
      label: "Visitor or Account ID",
      type: "string",
      required: true,
    },
    {
      key: "fieldName",
      label: "Field Name",
      type: "string",
      required: true,
    },
  ],
  output: [
    {
      key: "value",
      type: "object",
      label: "The decoded value — text, a number, a boolean, or a list",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    for (const field of ["kind", "group", "id", "fieldName"]) {
      if (!p[field]) throw new Error(`\`${field}\` is required`);
    }
    const client = new PendoClient(ctx);
    const path = `/api/v1/metadata/${encodeURIComponent(String(p.kind))}/` +
      `${encodeURIComponent(String(p.group))}/value/${encodeURIComponent(String(p.id))}/` +
      `${encodeURIComponent(String(p.fieldName))}`;
    const value = await client.api(path);
    return { value };
  },
};

export default action;
