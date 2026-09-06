import type { ActionDefinition } from "@w6w/types";
import { WebinarGeekClient, type WebinarGeekPages } from "../lib/client.ts";
import {
  episodeTypeOptions,
  languageOptions,
  orderSortParams,
  paginationParams,
} from "../lib/params.ts";

/**
 * `GET /webinars` — the account's webinars, each with its episodes, broadcasts, registration
 * fields, department and creator nested in the response.
 */
interface Input {
  includePast?: boolean;
  seriesOnly?: boolean;
  language?: string;
  type?: string;
  userId?: number;
  departmentId?: number;
  order?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}

const webinarList: ActionDefinition<Input> = {
  key: "webinar-list",
  type: "search",
  resource: "webinar",
  title: "List Webinars",
  description: "List the account's webinars, optionally filtered by language, type or owner.",
  params: [
    {
      key: "includePast",
      label: "Include past broadcasts",
      type: "boolean",
      default: false,
      hint: "Include broadcasts that already happened in each webinar's nested episodes.",
    },
    {
      key: "seriesOnly",
      label: "Series only",
      type: "boolean",
      default: false,
      hint: "Only webinars with 2 or more episodes.",
    },
    { key: "language", label: "Language", type: "select", options: languageOptions },
    {
      key: "type",
      label: "Episode type",
      type: "select",
      options: episodeTypeOptions,
      hint: "Filters by a single episode type at a time.",
    },
    { key: "userId", label: "Created by user ID", type: "number" },
    { key: "departmentId", label: "Department ID", type: "number" },
    ...orderSortParams([{ value: "created_at", label: "Created at" }], "created_at"),
    ...paginationParams(),
  ],
  output: [
    { key: "webinars", type: "array", label: "Webinars" },
    { key: "totalCount", type: "number", label: "Total matching webinars" },
    { key: "page", type: "number", label: "Current page" },
    { key: "perPage", type: "number", label: "Results per page" },
    { key: "totalPages", type: "number", label: "Total pages" },
  ],

  async execute(input, ctx) {
    const body = await new WebinarGeekClient(ctx).request<
      { total_count?: number; webinars?: unknown[]; pages?: WebinarGeekPages }
    >("/webinars", {
      query: {
        include_past: input.includePast,
        series_only: input.seriesOnly,
        language: input.language,
        type: input.type,
        user_id: input.userId,
        department_id: input.departmentId,
        order: input.order,
        sort: input.sort,
        page: input.page,
        per_page: input.perPage,
      },
    });
    return {
      webinars: body?.webinars ?? [],
      totalCount: body?.total_count ?? 0,
      page: body?.pages?.page,
      perPage: body?.pages?.per_page,
      totalPages: body?.pages?.total_pages,
    };
  },
};

export default webinarList;
