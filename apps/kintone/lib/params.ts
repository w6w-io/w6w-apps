import type { Param } from "@w6w/types";

/** The Kintone App ID every record/form action targets. */
export const APP_ID_PARAM: Param = {
  key: "appId",
  label: "App ID",
  type: "string",
  required: true,
  hint: "The Kintone App's numeric ID — shown in the App's URL " +
    "(`https://{subdomain}.cybozu.com/k/{appId}/`) or via the Get App action.",
};

/** One record's ID. */
export const RECORD_ID_PARAM: Param = {
  key: "recordId",
  label: "Record ID",
  type: "string",
  required: true,
  hint:
    'Kintone\'s built-in `$id` field, shown in the record\'s response as `{"$id": {"value": "100"}}`.',
};

/** Field codes and values, in Kintone's own wire shape. */
export const RECORD_FIELDS_PARAM: Param = {
  key: "record",
  label: "Field values",
  type: "json",
  hint: 'An object keyed by field code, each value wrapped as `{"value": ...}` — Kintone\'s own ' +
    'shape, e.g. `{"Text": {"value": "Sample"}, "Number": {"value": 1}}`. Get Form Fields shows ' +
    "every field code an App accepts. Omitted fields keep their default value on create, or are " +
    "left unchanged on update.",
};

/** The expected revision number, for optimistic-concurrency updates/deletes. */
export const REVISION_PARAM: Param = {
  key: "revision",
  label: "Expected Revision",
  type: "string",
  advanced: true,
  hint: "If set and it does not match the record's current revision, Kintone refuses the change " +
    "with an error instead of overwriting a concurrent edit. Leave blank or -1 to skip the check.",
};

/** Kintone's query-string mini-language, shared by search actions. */
export const QUERY_PARAM: Param = {
  key: "query",
  label: "Query",
  type: "string",
  hint: 'Kintone\'s query string, e.g. `Updated_datetime > "2024-08-03T09:00:00Z" order by $id ' +
    "asc limit 100 offset 0`. Omit to return every accessible record (subject to Kintone's own " +
    "page-size limit). See Kintone's Query String reference for the full operator/function list.",
};

/** Which field codes to return, to trim a large App's response. */
export const FIELDS_PARAM: Param = {
  key: "fields",
  label: "Field Codes",
  type: "json",
  advanced: true,
  hint:
    'JSON array of field codes to include, e.g. `["$id", "Created_by"]`. Omit to return every ' +
    "field this credential can read. A table (subtable) field code returns every field inside it.",
};
