import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/** `GET /categories` — every custom expense category. Also this app's auth probe endpoint. */
interface Input {
  limit?: number;
  order?: "asc" | "desc";
  startAfter?: string;
  endBefore?: string;
}

interface CategoriesResponse {
  categories?: unknown[];
  page?: { nextPage?: string; previousPage?: string };
}

const categoryList: ActionDefinition<Input> = {
  key: "category-list",
  type: "search",
  resource: "category",
  title: "List Categories",
  description: "List the organization's custom expense categories.",
  params: paginationParams(1000, "asc"),
  output: [
    { key: "items", type: "array", label: "Categories" },
    { key: "nextPage", type: "string", label: "Cursor for the next page" },
    { key: "previousPage", type: "string", label: "Cursor for the previous page" },
  ],

  async execute(input, ctx) {
    const body = await new MercuryClient(ctx).json<CategoriesResponse>("/categories", {
      query: {
        limit: input.limit,
        order: input.order,
        start_after: input.startAfter,
        end_before: input.endBefore,
      },
    });
    return {
      items: body?.categories ?? [],
      nextPage: body?.page?.nextPage,
      previousPage: body?.page?.previousPage,
    };
  },
};

export default categoryList;
