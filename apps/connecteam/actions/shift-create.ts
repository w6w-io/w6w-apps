import type { ActionDefinition } from "@w6w/types";
import { compact, ConnecteamClient, toIdList } from "../lib/client.ts";
import { jobIdParam, schedulerIdParam } from "../lib/params.ts";

/**
 * `POST /scheduler/v2/schedulers/{schedulerId}/shifts` — create one shift.
 *
 * Wraps a single `ShiftCreateRequest` in a one-element array (the vendor
 * endpoint accepts up to 500 per call). Either `title` or `jobId` must be
 * set — Connecteam rejects a shift with neither.
 *
 * Not idempotent: every call creates a new shift; there is no idempotency
 * key on this endpoint.
 */
interface Input {
  schedulerId: number;
  startTime: number;
  endTime: number;
  title?: string;
  jobId?: string;
  assignedUserIds?: string;
  isOpenShift?: boolean;
  openSpots?: number;
  isPublished?: boolean;
  isRequireAdminApproval?: boolean;
  timezone?: string;
  notifyUsers?: boolean;
}

const shiftCreate: ActionDefinition<Input> = {
  key: "shift-create",
  type: "perform",
  resource: "shift",
  title: "Create Shift",
  description: "Create one shift on a schedule.",
  idempotent: false,
  params: [
    schedulerIdParam,
    { key: "startTime", label: "Start time (Unix seconds)", type: "number", required: true },
    { key: "endTime", label: "End time (Unix seconds)", type: "number", required: true },
    {
      key: "title",
      label: "Title",
      type: "string",
      hint: "Required if no job is set.",
    },
    jobIdParam,
    {
      key: "assignedUserIds",
      label: "Assigned user IDs",
      type: "string",
      hint: "Comma-separated. Leave empty for an open shift.",
    },
    {
      key: "isOpenShift",
      label: "Open shift",
      type: "boolean",
      hint: "Creates with 1 open spot unless Open spots is also set.",
    },
    {
      key: "openSpots",
      label: "Open spots",
      type: "number",
      hint: "Only for an open shift.",
    },
    { key: "isPublished", label: "Published", type: "boolean" },
    {
      key: "isRequireAdminApproval",
      label: "Require admin approval to claim",
      type: "boolean",
      hint: "Only for an open shift.",
    },
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      hint: "Tz name (e.g. America/New_York). Defaults to the app's own setting.",
    },
    {
      key: "notifyUsers",
      label: "Notify assigned users",
      type: "boolean",
      default: true,
      hint: "Only applies to published shifts.",
    },
  ],
  output: [
    { key: "shifts", type: "array", label: "Created shift(s)" },
  ],

  execute(input, ctx) {
    if (!input.title && !input.jobId) {
      throw new Error("Set either Title or a Job — Connecteam requires at least one");
    }
    return new ConnecteamClient(ctx).data(
      `/scheduler/v2/schedulers/${input.schedulerId}/shifts`,
      {
        method: "POST",
        query: { notifyUsers: input.notifyUsers },
        body: [
          compact({
            startTime: input.startTime,
            endTime: input.endTime,
            title: input.title,
            jobId: input.jobId,
            assignedUserIds: toIdList(input.assignedUserIds),
            isOpenShift: input.isOpenShift,
            openSpots: input.openSpots,
            isPublished: input.isPublished,
            isRequireAdminApproval: input.isRequireAdminApproval,
            timezone: input.timezone,
          }),
        ],
      },
    );
  },
};

export default shiftCreate;
