import type { ActionDefinition } from "@w6w/types";
import { PinterestClient } from "../lib/client.ts";
import { adAccountIdParam, boardIdParam } from "../lib/params.ts";

/** `GET /v5/boards/{board_id}` — one board's metadata. */
interface Input {
  boardId: string;
  adAccountId?: string;
}

const boardGet: ActionDefinition<Input> = {
  key: "board-get",
  type: "read",
  resource: "board",
  title: "Get Board",
  description: "Fetch one board's metadata by ID.",
  params: [boardIdParam, adAccountIdParam],
  output: [
    { key: "id", type: "string", label: "Board ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "privacy", type: "string", label: "Privacy" },
    { key: "pin_count", type: "number", label: "Pin count" },
    { key: "follower_count", type: "number", label: "Follower count" },
    { key: "owner", type: "object", label: "Owner" },
  ],

  async execute(input, ctx) {
    return await new PinterestClient(ctx).json(`/boards/${encodeURIComponent(input.boardId)}`, {
      query: { ad_account_id: input.adAccountId },
    });
  },
};

export default boardGet;
