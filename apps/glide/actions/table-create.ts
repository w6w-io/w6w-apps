import type { ActionDefinition } from "@w6w/types";
import { asJson, asOptionalJson, GlideClient } from "../lib/client.ts";
import { asyncParam, onSchemaErrorParam } from "../lib/params.ts";

/**
 * `POST /tables` — create a new Big Table, optionally defining its schema and
 * populating it with initial rows.
 *
 * `rows` accepts either an inline array of row objects (fine for a few hundred
 * rows) or `{"$stashID": "..."}` to reference data already uploaded via Stash
 * Data — Glide's own guidance is to stash anything past "a few hundred rows".
 *
 * If `schema` is omitted, Glide infers column types from the row data. When
 * both `schema` and `rows` are given, row data must match that schema — see
 * `onSchemaError` for what happens when it doesn't.
 *
 * **Not idempotent.** Every call creates a new table; there is no name-based
 * upsert.
 */
interface Input {
  name: string;
  schema?: unknown;
  rows: unknown;
  appsToLink?: string;
  onSchemaError?: string;
  asynchronous?: boolean;
}

interface Output {
  tableID: string;
  jobID: string;
}

const tableCreate: ActionDefinition<Input, Output> = {
  key: "table-create",
  type: "perform",
  resource: "table",
  title: "Create Table",
  description:
    "Create a new Big Table, optionally with an explicit column schema and initial rows.",
  idempotent: false,
  params: [
    { key: "name", label: "Table name", type: "string", required: true, placeholder: "Invoices" },
    {
      key: "schema",
      label: "Column schema",
      type: "json",
      hint: 'An object of `{"columns": [{"id": "fullName", "displayName": "Full Name", ' +
        '"type": {"kind": "string"}}, ...]}`. Omit to let Glide infer columns from the row data.',
    },
    {
      key: "rows",
      label: "Rows",
      type: "json",
      required: true,
      hint:
        'An array of row objects (`[{"fullName": "Alex Bard", "totalAmount": 34.5}, ...]`) or ' +
        'a stash reference (`{"$stashID": "20240215-job32"}`) from Stash Data, for datasets too ' +
        "large to send inline.",
    },
    {
      key: "appsToLink",
      label: "Apps to link (comma-separated app IDs)",
      type: "string",
      hint: "Link the new table to these Glide apps immediately.",
    },
    onSchemaErrorParam,
    asyncParam,
  ],
  output: [
    { key: "tableID", type: "string", label: "The new table's id" },
    { key: "jobID", type: "string", label: "Async job id — check with Get Job Status" },
  ],

  execute(input, ctx) {
    const appsToLink = (input.appsToLink ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    return new GlideClient(ctx).data<Output>("/tables", {
      method: "POST",
      query: { onSchemaError: input.onSchemaError },
      headers: input.asynchronous === undefined
        ? {}
        : { "x-glide-asynchronous": input.asynchronous ? "true" : "false" },
      body: {
        name: input.name,
        schema: asOptionalJson<Record<string, unknown>>(input.schema, "Column schema"),
        rows: asJson<unknown>(input.rows, "Rows"),
        ...(appsToLink.length > 0 ? { appsToLink } : {}),
      },
    });
  },
};

export default tableCreate;
