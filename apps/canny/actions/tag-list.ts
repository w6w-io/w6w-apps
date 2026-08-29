import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";
import { boardIdParam, skipLimitParams } from "../lib/params.ts";

/** `POST /v1/tags/list` — the tags defined on a board, or across the workspace. */
interface Input {
  boardID?: string;
  limit?: number;
  skip?: number;
}

const tagList: ActionDefinition<Input> = {
  key: "tag-list",
  type: "search",
  resource: "tag",
  title: "List Tags",
  description: "List a board's tags, or every tag in the workspace.",
  params: [boardIdParam(false), ...skipLimitParams(10, "Defaults to 10 if not specified.")],
  output: [
    { key: "tags", type: "array", label: "Tags" },
    { key: "hasMore", type: "boolean", label: "More tags beyond this page" },
  ],

  execute(input, ctx) {
    return new CannyClient(ctx).post("/tags/list", {
      boardID: input.boardID,
      limit: input.limit,
      skip: input.skip,
    });
  },
};

export default tagList;
