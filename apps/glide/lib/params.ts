import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Glide actions.
 *
 * Every option, pattern and default here comes from Glide's own OpenAPI
 * document (fetched 2026-09-06) and the prose pages it links to, not from
 * inference.
 */

/** The Big Table every row/table action operates on. */
export const tableIdParam: Param = {
  key: "tableId",
  label: "Table ID",
  type: "string",
  required: true,
  hint: "A Big Table's id, e.g. `2a1bad8b-cf7c-44437-b8c1-e3782df6`. List Tables returns every " +
    "Big Table this connection's team owns.",
};

export const rowIdParam: Param = {
  key: "rowId",
  label: "Row ID",
  type: "string",
  required: true,
};

/**
 * `onSchemaError`, shared by every write that can conflict with a table's
 * schema (create table, add rows, update row, overwrite table). Left unset,
 * Glide's documented default is `abort` — the call fails outright rather than
 * silently dropping or reshaping data.
 */
export const onSchemaErrorParam: Param = {
  key: "onSchemaError",
  label: "On schema error",
  type: "select",
  options: [
    { value: "abort", label: "Abort — fail the call and return an error (Glide's default)" },
    {
      value: "dropColumns",
      label: "Drop columns — ignore the offending data, skip those columns for affected rows",
    },
    {
      value: "updateSchema",
      label: "Update schema — add missing columns / widen types, then import",
    },
  ],
  hint: "What Glide should do when the passed row data doesn't match the table's schema.",
};

/**
 * `x-glide-asynchronous`, on Create Table and Overwrite Table. Glide's own
 * description: it *allows* asynchronous processing (a `jobID` to poll via Job
 * Status) but does not *force* it — the caller must handle either a
 * synchronous or an asynchronous response either way, which is why this app's
 * table-create/table-overwrite actions always check for `jobId` in the result
 * rather than assuming one shape.
 */
export const asyncParam: Param = {
  key: "asynchronous",
  label: "Allow asynchronous processing",
  type: "boolean",
  hint:
    "Lets Glide answer with a job id to poll (Get Job Status) instead of waiting inline for a " +
    "large import. Glide may still respond synchronously even when this is on.",
};

/**
 * `If-Match`, on Update Row and Overwrite Table. Glide's own data-versioning
 * guide: send the ETag/Get Rows Version value you last read, and the write is
 * rejected with `412 Precondition Failed` if the table (Overwrite Table) or row
 * (Update Row) changed since.
 */
export const ifMatchParam: Param = {
  key: "ifMatch",
  label: "If-Match version",
  type: "string",
  advanced: true,
  hint:
    "Optional optimistic-concurrency guard. Pass the exact quoted version string from a prior " +
    'ETag or Get Rows Version read, e.g. `"42"` (including the quotes). Glide answers ' +
    "412 Precondition Failed if the data changed since.",
};

/** A single row's field values, keyed by column id/name. */
export const rowFieldsParam: Param = {
  key: "fields",
  label: "Field values",
  type: "json",
  required: true,
  hint: 'An object of column values, e.g. `{"fullName": "Alex Bard", "totalAmount": 34.5}`. Keys ' +
    "are the column ids shown in the Data Editor.",
};
