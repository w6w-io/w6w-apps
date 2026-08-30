import type { ActionDefinition } from "@w6w/types";
import { ConnecteamClient } from "../lib/client.ts";
import { dateRangeParams, paginationParams } from "../lib/params.ts";

/** `GET /forms/v1/forms` — the account's forms. */
interface Input {
  name?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

const formList: ActionDefinition<Input> = {
  key: "form-list",
  type: "search",
  resource: "form",
  title: "List Forms",
  description: "List forms, optionally filtered by name or creation date.",
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: "Partial, case-insensitive match.",
    },
    ...dateRangeParams(false, {
      start: "ISO 8601 (YYYY-MM-DD). Forms created on or after this date, inclusive.",
      end: "ISO 8601 (YYYY-MM-DD). Forms created on or before this date, inclusive.",
    }),
    ...paginationParams(300),
  ],
  output: [
    { key: "forms", type: "array", label: "Forms" },
    { key: "offset", type: "number", label: "Offset of this page" },
    { key: "total", type: "number", label: "Total matching forms (when computed)" },
  ],

  async execute(input, ctx) {
    const { data, paging } = await new ConnecteamClient(ctx).page<{ forms: unknown[] }>(
      "/forms/v1/forms",
      {
        query: {
          name: input.name,
          startDate: input.startDate,
          endDate: input.endDate,
          limit: input.limit,
          offset: input.offset,
        },
      },
    );
    return { forms: data.forms ?? [], ...paging };
  },
};

export default formList;
