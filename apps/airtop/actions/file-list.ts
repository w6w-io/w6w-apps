import type { ActionDefinition } from "@w6w/types";
import { AirtopClient, compact, csv } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/** `GET /v1/files` — list files, optionally filtered by session. */
interface Input {
  sessionIds?: string;
  limit?: number;
  offset?: number;
}

const fileList: ActionDefinition<Input> = {
  key: "file-list",
  type: "read",
  resource: "file",
  title: "List Files",
  description: "List files, optionally filtered by the sessions they're associated with.",
  params: [
    {
      key: "sessionIds",
      label: "Session IDs",
      type: "string",
      hint: "Comma-separated list of session IDs to filter by. Leave empty for all.",
    },
    ...paginationParams(10),
  ],
  output: [
    { key: "files", type: "array", label: "Files" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    return new AirtopClient(ctx).data("/v1/files", {
      query: compact({
        sessionIds: csv(input.sessionIds),
        limit: input.limit,
        offset: input.offset,
      }),
    });
  },
};

export default fileList;
