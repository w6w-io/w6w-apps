import type { ActionDefinition } from "@w6w/types";
import { JiraDcClient } from "../lib/client.ts";
import { issueKey, pagination } from "../lib/params.ts";

interface Input {
  issueKey: string;
  orderBy?: string;
  maxResults?: number;
  startAt?: number;
}

const commentGetMany: ActionDefinition<Input> = {
  key: "comment-get-many",
  type: "search",
  resource: "comment",
  title: "List Comments",
  description: "List the comments on an issue.",
  params: [
    issueKey,
    {
      key: "orderBy",
      label: "Order by",
      type: "select",
      options: [
        { label: "Created (ascending)", value: "created" },
        { label: "Created (descending)", value: "-created" },
      ],
      advanced: true,
    },
    ...pagination,
  ],
  output: [
    { key: "comments", type: "array", label: "Comments" },
    { key: "total", type: "number", label: "Total" },
    { key: "startAt", type: "number", label: "Offset of this page" },
  ],

  execute(input, ctx) {
    return new JiraDcClient(ctx).request(`/issue/${encodeURIComponent(input.issueKey)}/comment`, {
      query: {
        orderBy: input.orderBy,
        maxResults: input.maxResults,
        startAt: input.startAt,
      },
    });
  },
};

export default commentGetMany;
