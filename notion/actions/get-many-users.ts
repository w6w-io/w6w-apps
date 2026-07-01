import type { ActionDefinition } from "@w6w/types";
import { NotionClient, type NotionListResponse } from "../lib/client.ts";

interface Input {
  pageSize?: number;
  startCursor?: string;
}

const getManyUsers: ActionDefinition<Input, NotionListResponse> = {
  key: "get-many-users",
  type: "read",
  resource: "user",
  title: "Get Many Users",
  description: "List every user in the workspace. Returns one page — pass `startCursor` back to walk.",
  params: [
    { key: "pageSize", label: "Page size", type: "number", default: 100 },
    { key: "startCursor", label: "Start cursor", type: "string" },
  ],
  output: [
    { key: "results", type: "array", label: "Users" },
    { key: "next_cursor", type: "string", label: "Next cursor" },
    { key: "has_more", type: "boolean", label: "Has more" },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request<NotionListResponse>("/users", {
      query: {
        page_size: input.pageSize ?? 100,
        start_cursor: input.startCursor,
      },
    });
  },
};

export default getManyUsers;
