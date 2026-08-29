import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection, WrikeClient } from "../lib/client.ts";
import { paginationParams, taskIdParam } from "../lib/params.ts";

/** `GET /tasks/{taskId}/timelogs` — the timelog records booked against a task. */
interface Input {
  taskId: string;
  me?: boolean;
  pageSize?: number;
  nextPageToken?: string;
}

const timelogList: ActionDefinition<Input> = {
  key: "timelog-list",
  type: "search",
  resource: "timelog",
  title: "List Task Timelogs",
  description: "List timelog (time-tracking) records booked against a task.",
  params: [
    taskIdParam,
    {
      key: "me",
      label: "Only mine",
      type: "boolean",
      hint: "Return only timelogs created by the requesting user.",
    },
    ...paginationParams(100),
  ],
  output: [{ key: "items", type: "array", label: "Timelogs" }],

  async execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    const items = await new WrikeClient(ctx, host).list(
      `/tasks/${encodeURIComponent(input.taskId)}/timelogs`,
      { query: { me: input.me, pageSize: input.pageSize, nextPageToken: input.nextPageToken } },
    );
    return { items };
  },
};

export default timelogList;
