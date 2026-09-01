import type { ActionDefinition } from "@w6w/types";
import { json, PendoClient } from "../lib/client.ts";

/**
 * `PUT /api/v1/metadata/:kind/:group/value/:id/:fieldName` — set one
 * metadata field on a visitor or account.
 *
 * The request body IS the raw JSON-encoded value — not wrapped in an
 * envelope — so a text field takes `"a string"`, a number `42`, a boolean
 * `true`, a list `["a","b"]`. Setting a `custom` field that does not exist
 * yet creates it (as text, until reassigned a real type on the Data
 * Mappings page), but every other `group` (`agent`, `salesforce`, …) needs
 * the field to already exist.
 */
const action: ActionDefinition = {
  key: "set-metadata-value",
  type: "perform",
  resource: "metadata",
  title: "Set Metadata Value",
  description:
    "Set the value of one metadata field on a single visitor or account. A new `custom` field " +
    "is created automatically if the name doesn't exist yet; every other group needs the " +
    "field to already exist in Data Mappings.",
  idempotent: true,
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
    {
      key: "value",
      label: "Value",
      type: "json",
      required: true,
      hint: 'The raw value — a plain string like "trial" (with quotes) or "42", true, or a ' +
        "JSON array/object.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Value was set" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    for (const field of ["kind", "group", "id", "fieldName"]) {
      if (!p[field]) throw new Error(`\`${field}\` is required`);
    }
    const value = json(p.value, "value");
    if (value === undefined) throw new Error("`value` is required");

    const client = new PendoClient(ctx);
    const path = `/api/v1/metadata/${encodeURIComponent(String(p.kind))}/` +
      `${encodeURIComponent(String(p.group))}/value/${encodeURIComponent(String(p.id))}/` +
      `${encodeURIComponent(String(p.fieldName))}`;
    await client.api(path, { method: "PUT", body: value });

    ctx.log("info", "set Pendo metadata field", {
      kind: p.kind,
      group: p.group,
      fieldName: p.fieldName,
    });
    return { ok: true };
  },
};

export default action;
