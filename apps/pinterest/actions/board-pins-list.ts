import type { ActionDefinition } from "@w6w/types";
import { PinterestClient, type PinterestListPage } from "../lib/client.ts";
import {
  adAccountIdParam,
  boardIdParam,
  paginationParams,
  paginationQuery,
} from "../lib/params.ts";

/** `GET /v5/boards/{board_id}/pins` — the Pins on one board. */
interface Input {
  boardId: string;
  adAccountId?: string;
  pageSize?: number;
  bookmark?: string;
}

const boardPinsList: ActionDefinition<Input> = {
  key: "board-pins-list",
  type: "search",
  resource: "board",
  title: "List Pins on Board",
  description: "List the Pins on one board.",
  params: [boardIdParam, adAccountIdParam, ...paginationParams()],
  output: [
    { key: "items", type: "array", label: "Pins" },
    { key: "bookmark", type: "string", label: "Next page cursor" },
  ],

  async execute(input, ctx) {
    return await new PinterestClient(ctx).json<PinterestListPage<unknown>>(
      `/boards/${encodeURIComponent(input.boardId)}/pins`,
      { query: { ad_account_id: input.adAccountId, ...paginationQuery(input) } },
    );
  },
};

export default boardPinsList;
