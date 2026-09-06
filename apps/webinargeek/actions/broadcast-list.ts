import type { ActionDefinition } from "@w6w/types";
import { WebinarGeekClient, type WebinarGeekPages } from "../lib/client.ts";
import { orderSortParams, paginationParams } from "../lib/params.ts";

/** `GET /broadcasts` — the account's broadcasts, live or on-demand. */
interface Input {
  nestedResources?: string;
  order?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}

const broadcastList: ActionDefinition<Input> = {
  key: "broadcast-list",
  type: "search",
  resource: "broadcast",
  title: "List Broadcasts",
  description: "List the account's broadcasts across every webinar.",
  params: [
    {
      key: "nestedResources",
      label: "Include nested resources",
      type: "select",
      options: [
        { value: "episode", label: "Episode" },
        { value: "webinar", label: "Webinar" },
        { value: "episode,webinar", label: "Episode and webinar" },
      ],
      advanced: true,
      hint: "Embed the parent episode and/or webinar in each broadcast to avoid extra calls.",
    },
    ...orderSortParams(
      [{ value: "created_at", label: "Created at" }, { value: "date", label: "Date" }],
      "date",
    ),
    ...paginationParams(),
  ],
  output: [
    { key: "broadcasts", type: "array", label: "Broadcasts" },
    { key: "totalCount", type: "number", label: "Total matching broadcasts" },
    { key: "page", type: "number", label: "Current page" },
    { key: "perPage", type: "number", label: "Results per page" },
    { key: "totalPages", type: "number", label: "Total pages" },
  ],

  async execute(input, ctx) {
    const body = await new WebinarGeekClient(ctx).request<
      { total_count?: number; broadcasts?: unknown[]; pages?: WebinarGeekPages }
    >("/broadcasts", {
      query: {
        nested_resources: input.nestedResources,
        order: input.order,
        sort: input.sort,
        page: input.page,
        per_page: input.perPage,
      },
    });
    return {
      broadcasts: body?.broadcasts ?? [],
      totalCount: body?.total_count ?? 0,
      page: body?.pages?.page,
      perPage: body?.pages?.per_page,
      totalPages: body?.pages?.total_pages,
    };
  },
};

export default broadcastList;
