import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";
import { boardIdParam, skipLimitParams } from "../lib/params.ts";

/**
 * `POST /v1/categories/list` — the categories (and subcategories) defined on
 * a board, or across the whole workspace if `boardID` is omitted.
 *
 * Canny's own "Returns" text for this endpoint says the response contains
 * "an array of tag objects" — a copy-paste error in Canny's reference: the
 * `categories` array holds Category objects (see the Category object section
 * of the same reference), and the example JSON response confirms it.
 */
interface Input {
  boardID?: string;
  limit?: number;
  skip?: number;
}

const categoryList: ActionDefinition<Input> = {
  key: "category-list",
  type: "search",
  resource: "category",
  title: "List Categories",
  description: "List a board's categories and subcategories.",
  params: [
    boardIdParam(false),
    ...skipLimitParams(10, "Defaults to 10 if not specified. Canny's own maximum is 10,000."),
  ],
  output: [
    { key: "categories", type: "array", label: "Categories" },
    { key: "hasMore", type: "boolean", label: "More categories beyond this page" },
  ],

  execute(input, ctx) {
    return new CannyClient(ctx).post("/categories/list", {
      boardID: input.boardID,
      limit: input.limit,
      skip: input.skip,
    });
  },
};

export default categoryList;
