import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";
import { postOutput } from "../lib/output.ts";
import { boardIdParam } from "../lib/params.ts";

/**
 * `POST /v1/posts/retrieve` — a single post, by `id` or by `urlName` (in
 * which case `boardID` is also required, per Canny's own docs).
 */
interface Input {
  id?: string;
  urlName?: string;
  boardID?: string;
}

const postGet: ActionDefinition<Input> = {
  key: "post-get",
  type: "read",
  resource: "post",
  title: "Get Post",
  description: "Retrieve a single post by id, or by board + urlName.",
  params: [
    { key: "id", label: "Post ID", type: "string", hint: "The post's unique identifier." },
    {
      key: "urlName",
      label: "URL name",
      type: "string",
      hint: "The post's unique urlName. Requires Board to also be set.",
    },
    { ...boardIdParam(false), hint: "Required only when fetching by URL name." },
  ],
  output: postOutput,

  execute(input, ctx) {
    return new CannyClient(ctx).post("/posts/retrieve", {
      id: input.id,
      urlName: input.urlName,
      boardID: input.boardID,
    });
  },
};

export default postGet;
