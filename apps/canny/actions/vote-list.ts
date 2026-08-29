import type { ActionDefinition } from "@w6w/types";
import { v2 } from "../lib/client.ts";
import { boardIdParam, cursorLimitParams } from "../lib/params.ts";

/** `POST /v2/votes/list` — cursor-paginated vote search. */
interface Input {
  boardID?: string;
  companyID?: string;
  postID?: string;
  userID?: string;
  limit?: number;
  cursor?: string;
}

const voteList: ActionDefinition<Input> = {
  key: "vote-list",
  type: "search",
  resource: "vote",
  title: "List Votes",
  description: "Search votes, optionally filtered by board, post, user or company.",
  params: [
    boardIdParam(false),
    { key: "postID", label: "Post", type: "string", hint: "Only votes for this post." },
    { key: "userID", label: "User", type: "string", hint: "Only votes cast by this user." },
    {
      key: "companyID",
      label: "Company",
      type: "string",
      hint: "Only votes cast by users linked to this company.",
    },
    ...cursorLimitParams(10, 100),
  ],
  output: [
    { key: "items", type: "array", label: "Votes" },
    { key: "hasNextPage", type: "boolean", label: "More votes beyond this page" },
    { key: "cursor", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return v2(ctx).post("/votes/list", {
      boardID: input.boardID,
      companyID: input.companyID,
      postID: input.postID,
      userID: input.userID,
      limit: input.limit,
      cursor: input.cursor,
    });
  },
};

export default voteList;
