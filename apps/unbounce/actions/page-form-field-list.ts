import type { ActionDefinition, Param } from "@w6w/types";
import { encodeId, flag, UnbounceClient } from "../lib/client.ts";
import { pageIdParam } from "../lib/params.ts";

/**
 * `GET /pages/{page_id}/form_fields` — every form field across all of a page's
 * variants. Unlike the other collection endpoints in this app, this one takes
 * no `offset`/`limit`/`from`/`to` — a page's form field count is small and
 * fixed by its design, not something worth paging.
 */
interface Input {
  pageId: string;
  sortOrder?: string;
  count?: boolean;
  includeSubPages?: boolean;
}

const params: Param[] = [
  pageIdParam,
  {
    key: "sortOrder",
    label: "Sort order",
    type: "select",
    default: "asc",
    options: [
      { value: "asc", label: "Ascending (default)" },
      { value: "desc", label: "Descending" },
    ],
    hint: "Sort by creation date.",
  },
  {
    key: "count",
    label: "Count only",
    type: "boolean",
    hint: "When on, the response omits the collection itself — only metadata.count is returned.",
  },
  {
    key: "includeSubPages",
    label: "Include sub-page fields",
    type: "boolean",
    hint: "Include form fields from AMP/pop-up/sticky-bar sub-pages in the response.",
  },
];

const pageFormFieldList: ActionDefinition<Input> = {
  key: "page-form-field-list",
  type: "search",
  resource: "form-field",
  title: "List Form Fields",
  description: "Retrieve every form field across all variants of a page (name, type, validations).",
  params,
  output: [
    { key: "form_fields", type: "array", label: "Form Fields" },
    { key: "metadata", type: "object", label: "Collection metadata" },
  ],

  execute(input, ctx) {
    return new UnbounceClient(ctx).get(`/pages/${encodeId(input.pageId)}/form_fields`, {
      sort_order: input.sortOrder,
      count: flag(input.count),
      include_sub_pages: flag(input.includeSubPages),
    });
  },
};

export default pageFormFieldList;
