import type { ActionDefinition } from "@w6w/types";
import { compact, ConnecteamClient, toIdList } from "../lib/client.ts";
import { schedulerIdParam, shiftIdParam } from "../lib/params.ts";

/**
 * `PUT /scheduler/v2/schedulers/{schedulerId}/shifts` — update one shift's
 * fields. Wraps a single `ShiftUpdateRequest` (which carries its own
 * `shiftId`) in a one-element array.
 *
 * Idempotent: setting the same target fields twice ends in the same state.
 * Note the response can carry `deletedShiftIds` / `createdShifts` — some
 * updates (e.g. splitting an assignment) replace a shift with new ones rather
 * than editing it in place; both are surfaced in the output.
 */
interface Input {
  schedulerId: number;
  shiftId: string;
  startTime?: number;
  endTime?: number;
  title?: string;
  jobId?: string;
  assignedUserIds?: string;
  isPublished?: boolean;
  timezone?: string;
  notifyUsers?: boolean;
}

const shiftUpdate: ActionDefinition<Input> = {
  key: "shift-update",
  type: "perform",
  resource: "shift",
  title: "Update Shift",
  description: "Update one shift's fields.",
  idempotent: true,
  params: [
    schedulerIdParam,
    shiftIdParam,
    { key: "startTime", label: "Start time (Unix seconds)", type: "number" },
    { key: "endTime", label: "End time (Unix seconds)", type: "number" },
    { key: "title", label: "Title", type: "string" },
    { key: "jobId", label: "Job", type: "string" },
    {
      key: "assignedUserIds",
      label: "Assigned user IDs",
      type: "string",
      hint: "Comma-separated.",
    },
    { key: "isPublished", label: "Published", type: "boolean" },
    { key: "timezone", label: "Timezone", type: "string" },
    {
      key: "notifyUsers",
      label: "Notify assigned users",
      type: "boolean",
      default: true,
      hint: "Only applies to published shifts.",
    },
  ],
  output: [
    { key: "shifts", type: "array", label: "Updated shift(s)" },
    { key: "createdShifts", type: "array", label: "Shifts created as a side effect" },
    { key: "deletedShiftIds", type: "array", label: "Shift ids deleted as a side effect" },
  ],

  execute(input, ctx) {
    return new ConnecteamClient(ctx).data(
      `/scheduler/v2/schedulers/${input.schedulerId}/shifts`,
      {
        method: "PUT",
        query: { notifyUsers: input.notifyUsers },
        body: [
          compact({
            shiftId: input.shiftId,
            startTime: input.startTime,
            endTime: input.endTime,
            title: input.title,
            jobId: input.jobId,
            assignedUserIds: toIdList(input.assignedUserIds),
            isPublished: input.isPublished,
            timezone: input.timezone,
          }),
        ],
      },
    );
  },
};

export default shiftUpdate;
