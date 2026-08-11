import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, flag, FormstackClient } from "../lib/client.ts";

/**
 * `GET /forms/{formId}/submissions` — a form's entries.
 *
 * ## `data` is off by default, and without it a submission is just a timestamp
 *
 * The response carries a submission's metadata unconditionally, but the actual
 * **answers** only appear when `data=true`. A workflow that reads submissions
 * and finds no field values has almost always left this off. It defaults to
 * **on** here for that reason.
 *
 * `expandData` goes further and returns parsed values rather than raw ones —
 * useful for select and matrix fields, where the raw form is an encoded string.
 *
 * ## `dataFormat` decides the shape of what you get
 *
 * `legacy` (the vendor's default) keys `data` by **field id**, which is what
 * List Form Fields publishes. The alternative is an array form. This action
 * leaves the default in place and names it, rather than picking for you and
 * making downstream steps guess.
 *
 * ## Dates and search
 *
 * `minTime`/`maxTime` bound the creation time. `search` filters by *specific
 * fields* and takes an array form (`search[fieldId]=value`), which no form field
 * can express — so it is taken here as a JSON object and expanded, the same
 * approach `apps/baserow` uses for its dynamic filters.
 */
interface Input {
  formId: string;
  data?: boolean;
  expandData?: boolean;
  prettyName?: boolean;
  keyword?: string;
  fieldSearch?: unknown;
  minTime?: string;
  maxTime?: string;
  order?: string;
  dataFormat?: string;
  pageNumber?: number;
  pageSize?: number;
}

const submissionList: ActionDefinition<Input> = {
  key: "submission-list",
  type: "search",
  resource: "submission",
  title: "List Submissions",
  description:
    "List a form's submissions. Field answers are included by default — without them a " +
    "submission is only metadata.",
  params: [
    { key: "formId", label: "Form ID", type: "string", required: true },
    {
      key: "data",
      label: "Include field data",
      type: "boolean",
      default: true,
      hint: "On by default. Off, a submission carries only its metadata — no answers.",
    },
    {
      key: "expandData",
      label: "Expand field data",
      type: "boolean",
      hint: "Return parsed values rather than raw ones. Useful for select and matrix fields.",
    },
    {
      key: "prettyName",
      label: "Include pretty name",
      type: "boolean",
      hint: "Adds a human-readable name for each submission, derived from the form's name fields.",
    },
    {
      key: "keyword",
      label: "Keyword",
      type: "string",
      hint: "Free-text search across all fields.",
    },
    {
      key: "fieldSearch",
      label: "Field search",
      type: "json",
      hint: 'An object of field id → value, e.g. `{"12345": "ada@example.com"}`, expanded into ' +
        "Formstack's `search[fieldId]` parameters. Field ids come from List Form Fields.",
    },
    {
      key: "minTime",
      label: "Submitted on or after",
      type: "datetime",
      hint: "Bounds the submission time.",
    },
    { key: "maxTime", label: "Submitted on or before", type: "datetime" },
    {
      key: "order",
      label: "Direction",
      type: "select",
      options: [
        { value: "ASC", label: "Ascending — oldest first" },
        { value: "DESC", label: "Descending — newest first" },
      ],
    },
    {
      key: "dataFormat",
      label: "Data format",
      type: "select",
      options: [
        { value: "legacy", label: "Legacy — `data` keyed by field id (Formstack's default)" },
        { value: "array", label: "Array — `data` as a list" },
      ],
      hint: "Leave empty for the vendor's default, which is `legacy`.",
    },
    {
      key: "pageNumber",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "This endpoint uses `pageNumber`, not `page`.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Default 25. This endpoint uses `pageSize`, not `perPage`.",
    },
  ],
  output: [{ key: "data", type: "array", label: "Submissions" }],

  execute(input, ctx) {
    const query: Record<string, string | number | boolean | undefined> = {
      // Defaulted on: without it the answers are simply absent.
      data: flag(input.data ?? true),
      expandData: flag(input.expandData),
      prettyName: flag(input.prettyName),
      keyword: input.keyword,
      minTime: input.minTime,
      maxTime: input.maxTime,
      order: input.order,
      dataFormat: input.dataFormat,
      pageNumber: input.pageNumber,
      pageSize: input.pageSize,
    };

    // `search` is a dynamically-named parameter per field: `search[12345]=…`.
    const fieldSearch = asOptionalJson<Record<string, unknown>>(input.fieldSearch, "Field search");
    if (fieldSearch) {
      for (const [fieldId, value] of Object.entries(fieldSearch)) {
        if (value === undefined || value === null) continue;
        query[`search[${fieldId}]`] = String(value);
      }
    }

    return new FormstackClient(ctx).request(
      `/forms/${encodeURIComponent(input.formId)}/submissions`,
      { query },
    );
  },
};

export default submissionList;
