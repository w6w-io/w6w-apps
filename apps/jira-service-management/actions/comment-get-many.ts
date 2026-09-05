import type { ActionDefinition } from "@w6w/types";
import { JsmClient } from "../lib/client.ts";
import { issueIdOrKey, pagedOutput, pagination } from "../lib/params.ts";

interface Input {
  issueIdOrKey: string;
  public?: boolean;
  internal?: boolean;
  limit?: number;
  start?: number;
}

const commentGetMany: ActionDefinition<Input> = {
  key: "comment-get-many",
  type: "search",
  resource: "comment",
  title: "List Comments",
  description: "List the comments on a request.",
  params: [
    issueIdOrKey,
    {
      key: "public",
      label: "Include public",
      type: "boolean",
      advanced: true,
      hint: "Leave both off to get every comment this credential can see.",
    },
    { key: "internal", label: "Include internal", type: "boolean", advanced: true },
    ...pagination,
  ],
  output: pagedOutput,

  execute(input, ctx) {
    return new JsmClient(ctx).request(
      `/request/${encodeURIComponent(input.issueIdOrKey)}/comment`,
      {
        query: {
          public: input.public,
          internal: input.internal,
          start: input.start ?? 0,
          limit: input.limit ?? 50,
        },
      },
    );
  },
};

export default commentGetMany;
