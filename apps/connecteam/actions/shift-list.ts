import type { ActionDefinition } from "@w6w/types";
import { ConnecteamClient, toIdList, toList } from "../lib/client.ts";
import { paginationParams, schedulerIdParam, sortOrderOptions } from "../lib/params.ts";

/**
 * `GET /scheduler/v2/schedulers/{schedulerId}/shifts` — shifts on a schedule
 * within a time window. Uses the v2 shifts surface (v1 is also documented,
 * but v2 is the current one — see `README.md`).
 */
interface Input {
  schedulerId: number;
  startTime: number;
  endTime: number;
  isOpenShift?: boolean;
  isPublished?: boolean;
  isRequireAdminApproval?: boolean;
  jobId?: string;
  assignedUserIds?: string;
  shiftId?: string;
  title?: string;
  sort?: string;
  order?: string;
  limit?: number;
  offset?: number;
}

const shiftList: ActionDefinition<Input> = {
  key: "shift-list",
  type: "search",
  resource: "shift",
  title: "List Shifts",
  description: "List shifts on a schedule within a Unix-timestamp time window.",
  params: [
    schedulerIdParam,
    {
      key: "startTime",
      label: "Start time (Unix seconds)",
      type: "number",
      required: true,
    },
    { key: "endTime", label: "End time (Unix seconds)", type: "number", required: true },
    { key: "isOpenShift", label: "Open shifts only", type: "boolean" },
    { key: "isPublished", label: "Published only", type: "boolean" },
    { key: "isRequireAdminApproval", label: "Requires admin approval", type: "boolean" },
    { key: "jobId", label: "Job IDs", type: "string", hint: "Comma-separated." },
    {
      key: "assignedUserIds",
      label: "Assigned user IDs",
      type: "string",
      hint: "Comma-separated numeric ids.",
    },
    { key: "shiftId", label: "Shift IDs", type: "string", hint: "Comma-separated." },
    { key: "title", label: "Title", type: "string" },
    {
      key: "sort",
      label: "Sort key",
      type: "select",
      options: [
        { value: "created_at", label: "Created at (default)" },
        { value: "updated_at", label: "Updated at" },
      ],
    },
    { key: "order", label: "Sort order", type: "select", options: sortOrderOptions },
    ...paginationParams(500),
  ],
  output: [
    { key: "shifts", type: "array", label: "Shifts" },
    { key: "offset", type: "number", label: "Offset of this page" },
    { key: "total", type: "number", label: "Total matching shifts (when computed)" },
  ],

  async execute(input, ctx) {
    const { data, paging } = await new ConnecteamClient(ctx).page<{ shifts: unknown[] }>(
      `/scheduler/v2/schedulers/${input.schedulerId}/shifts`,
      {
        query: {
          startTime: input.startTime,
          endTime: input.endTime,
          isOpenShift: input.isOpenShift,
          isPublished: input.isPublished,
          isRequireAdminApproval: input.isRequireAdminApproval,
          jobId: toList(input.jobId),
          assignedUserIds: toIdList(input.assignedUserIds),
          shiftId: toList(input.shiftId),
          title: input.title,
          sort: input.sort,
          order: input.order,
          limit: input.limit,
          offset: input.offset,
        },
      },
    );
    return { shifts: data.shifts ?? [], ...paging };
  },
};

export default shiftList;
