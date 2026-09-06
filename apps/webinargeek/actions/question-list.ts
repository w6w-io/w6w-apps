import type { ActionDefinition } from "@w6w/types";
import { WebinarGeekClient, type WebinarGeekPages } from "../lib/client.ts";
import { paginationParams, scopeFilterParams } from "../lib/params.ts";

/**
 * `GET /questions` — questions posted through a webinar's Q&A feature, with their text answers
 * nested (live, spoken answers are not captured by this API — only typed ones).
 */
interface Input {
  webinarId?: number;
  episodeId?: number;
  broadcastId?: number;
  order?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}

const questionList: ActionDefinition<Input> = {
  key: "question-list",
  type: "search",
  resource: "question",
  title: "List Questions",
  description:
    "List Q&A questions and their text answers, account-wide or filtered to a webinar, " +
    "episode or broadcast. Live spoken answers are not captured — only typed ones.",
  params: [
    ...scopeFilterParams(),
    {
      key: "order",
      label: "Order by",
      type: "select",
      default: "created_at",
      options: [{ value: "created_at", label: "Created at" }],
    },
    {
      key: "sort",
      label: "Sort direction",
      type: "select",
      default: "desc",
      options: [{ value: "desc", label: "Descending" }, { value: "asc", label: "Ascending" }],
    },
    ...paginationParams(),
  ],
  output: [
    { key: "questions", type: "array", label: "Questions" },
    { key: "totalCount", type: "number", label: "Total matching questions" },
    { key: "page", type: "number", label: "Current page" },
    { key: "perPage", type: "number", label: "Results per page" },
    { key: "totalPages", type: "number", label: "Total pages" },
  ],

  async execute(input, ctx) {
    const body = await new WebinarGeekClient(ctx).request<
      { total_count?: number; questions?: unknown[]; pages?: WebinarGeekPages }
    >("/questions", {
      query: {
        webinar_id: input.webinarId,
        episode_id: input.episodeId,
        broadcast_id: input.broadcastId,
        order: input.order,
        sort: input.sort,
        page: input.page,
        per_page: input.perPage,
      },
    });
    return {
      questions: body?.questions ?? [],
      totalCount: body?.total_count ?? 0,
      page: body?.pages?.page,
      perPage: body?.pages?.per_page,
      totalPages: body?.pages?.total_pages,
    };
  },
};

export default questionList;
