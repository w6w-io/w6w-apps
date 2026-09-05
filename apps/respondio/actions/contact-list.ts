import type { ActionDefinition } from "@w6w/types";
import { compact, RespondioClient } from "../lib/client.ts";
import { filterCategoryOptions, filterOperatorOptions, paginationParams } from "../lib/params.ts";

/**
 * `POST /contact/list` — `ContactClient.list` in the official SDK. The filter
 * body and the pagination params travel separately (`this.http.post(path,
 * filter, pagination)` — pagination as query, filter as the JSON body), which
 * this client's `post(path, body, query)` mirrors directly.
 *
 * `ContactFilter.filter` is `{$and?: FilterCondition[]} | {$or?: FilterCondition[]}`
 * — one boolean combinator with a flat list of conditions, not an arbitrary
 * tree. This action exposes exactly that: pick AND or OR, then a flat list of
 * conditions. A condition's `value` is documented as `string | string[] |
 * {from, to} | null` depending on `operator`; this action collects it as one
 * string field and coerces it per the chosen operator (comma-split for the
 * "any/all/none of" operators, comma-split-in-two for the "between" operators,
 * dropped entirely for `exists`/`doesNotExist`).
 */
interface FilterConditionInput {
  category: "contactField" | "contactTag" | "lifecycle";
  field?: string;
  operator: string;
  value?: string;
}

interface Input {
  search?: string;
  timezone?: string;
  matchType?: "and" | "or";
  conditions?: FilterConditionInput[];
  limit?: number;
  cursorId?: number;
}

const MULTI_VALUE_OPERATORS = new Set(["hasAnyOf", "hasAllOf", "hasNoneOf"]);
const RANGE_OPERATORS = new Set(["isBetween", "isTimestampBetween"]);
const NO_VALUE_OPERATORS = new Set(["exists", "doesNotExist"]);

/** Coerce one condition's raw string value per its operator's documented shape. */
export function coerceFilterValue(
  operator: string,
  value: string | undefined,
): string | string[] | { from: string; to: string } | null | undefined {
  if (NO_VALUE_OPERATORS.has(operator)) return null;
  if (value === undefined || value === "") return undefined;
  if (MULTI_VALUE_OPERATORS.has(operator)) {
    return value.split(",").map((v) => v.trim()).filter(Boolean);
  }
  if (RANGE_OPERATORS.has(operator)) {
    const [from, to] = value.split(",").map((v) => v.trim());
    if (!from || !to) {
      throw new Error(`Operator "${operator}" needs a value shaped "from,to"`);
    }
    return { from, to };
  }
  return value;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts, optionally filtered by field, tag, or lifecycle conditions.",
  params: [
    { key: "search", label: "Search text", type: "string" },
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      default: "UTC",
      hint: 'IANA timezone, e.g. "America/New_York". Used to interpret timestamp conditions.',
    },
    {
      key: "matchType",
      label: "Match",
      type: "select",
      default: "and",
      options: [
        { value: "and", label: "All conditions (AND)" },
        { value: "or", label: "Any condition (OR)" },
      ],
    },
    {
      key: "conditions",
      label: "Conditions",
      type: "array",
      item: {
        type: "object",
        fields: [
          {
            key: "category",
            label: "Category",
            type: "select",
            required: true,
            options: filterCategoryOptions,
          },
          {
            key: "field",
            label: "Field name",
            type: "string",
            hint: 'For "Contact field", the custom field or built-in field name. Unused for ' +
              '"Lifecycle".',
          },
          {
            key: "operator",
            label: "Operator",
            type: "select",
            required: true,
            options: filterOperatorOptions,
          },
          {
            key: "value",
            label: "Value",
            type: "string",
            hint: 'Plain value, "a,b,c" for the "has ... of" operators, or "from,to" for the ' +
              '"between" operators. Leave empty for "exists"/"does not exist".',
          },
        ],
      },
    },
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Contacts" },
    { key: "pagination", type: "object", label: "Pagination cursor" },
  ],

  execute(input, ctx) {
    const conditions = (input.conditions ?? []).map((c) => ({
      category: c.category,
      field: c.field ?? null,
      operator: c.operator,
      value: coerceFilterValue(c.operator, c.value),
    }));
    const combinatorKey = input.matchType === "or" ? "$or" : "$and";

    return new RespondioClient(ctx).post(
      "/contact/list",
      compact({
        search: input.search,
        timezone: input.timezone || "UTC",
        filter: { [combinatorKey]: conditions },
      }),
      compact({ limit: input.limit, cursorId: input.cursorId }),
    );
  },
};

export default contactList;
