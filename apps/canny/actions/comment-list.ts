import type { ActionDefinition } from "@w6w/types";
import { v2 } from "../lib/client.ts";
import { boardIdParam, cursorLimitParams } from "../lib/params.ts";

/** `POST /v2/comments/list` — cursor-paginated portal comment search. */
interface Input {
  authorID?: string;
  boardID?: string;
  companyID?: string;
  postID?: string;
  limit?: number;
  cursor?: string;
}

const commentList: ActionDefinition<Input> = {
  key: "comment-list",
  type: "search",
  resource: "comment",
  title: "List Comments",
  description: "Search portal comments, optionally filtered by post, board, author or company.",
  params: [
    { key: "postID", label: "Post", type: "string", hint: "Only comments on this post." },
    boardIdParam(false),
    { key: "authorID", label: "Author", type: "string", hint: "Only comments by this author." },
    {
      key: "companyID",
      label: "Company",
      type: "string",
      hint: "Only comments by users linked to this company.",
    },
    ...cursorLimitParams(10, 100),
  ],
  output: [
    { key: "items", type: "array", label: "Comments" },
    { key: "hasNextPage", type: "boolean", label: "More comments beyond this page" },
    { key: "cursor", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return v2(ctx).post("/comments/list", {
      authorID: input.authorID,
      boardID: input.boardID,
      companyID: input.companyID,
      postID: input.postID,
      limit: input.limit,
      cursor: input.cursor,
    });
  },
};

export default commentList;
