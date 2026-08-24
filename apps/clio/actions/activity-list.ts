import type { ActionDefinition } from "@w6w/types";
import { ClioClient } from "../lib/client.ts";
import {
  activityStatusOptions,
  activityTypeOptions,
  fieldsParam,
  matterIdFilterParam,
  paginationParams,
  queryParam,
  refParam,
} from "../lib/params.ts";

/** `GET /activities.json` — time entries, expense entries, and hard/soft cost entries. */
interface Input {
  matterId?: number;
  userId?: number;
  taskId?: number;
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  query?: string;
  fields?: string;
  limit?: number;
  pageToken?: string;
}

const activityList: ActionDefinition<Input> = {
  key: "activity-list",
  type: "search",
  resource: "activity",
  title: "List Activities",
  description: "List time entries, expense entries and cost entries, optionally filtered by " +
    "matter, user, task, type or status.",
  params: [
    matterIdFilterParam,
    refParam("userId", "User ID"),
    refParam("taskId", "Task ID"),
    { key: "type", label: "Type", type: "select", options: activityTypeOptions },
    { key: "status", label: "Status", type: "select", options: activityStatusOptions },
    {
      key: "startDate",
      label: "Start date",
      type: "date",
      hint: "Activities on or after this date.",
    },
    { key: "endDate", label: "End date", type: "date", hint: "Activities on or before this date." },
    { ...queryParam, hint: "Wildcard search across the note field." },
    fieldsParam(
      "id,etag,type,date,quantity,price,total,note,non_billable,matter{id,display_number}," +
        "user{id,name}",
      "See activity-get for why `quantity`'s UNIT depends on the request's API minor version.",
    ),
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Activities" },
    { key: "nextPageToken", type: "string", label: "Token for the next page, if any" },
  ],

  execute(input, ctx) {
    return new ClioClient(ctx).list("/activities.json", {
      query: {
        matter_id: input.matterId,
        user_id: input.userId,
        task_id: input.taskId,
        type: input.type,
        status: input.status,
        start_date: input.startDate,
        end_date: input.endDate,
        query: input.query,
        fields: input.fields,
        limit: input.limit,
        order: "id(asc)",
        page_token: input.pageToken,
      },
    });
  },
};

export default activityList;
