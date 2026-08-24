import type { ActionDefinition } from "@w6w/types";
import { compact, ServiceM8Client } from "../lib/client.ts";

/**
 * `POST /jobactivity.json` — create a Job Activity (schedule a booking, or
 * record time against a Job). The reference marks no field `required` on
 * `JobActivityCreate`, but `job_uuid`/`staff_uuid`/`start_date`/`end_date` are
 * what actually makes an activity meaningful, so they are offered first —
 * none is asserted `required: true` here since the schema does not say so.
 */
interface Input {
  jobUuid?: string;
  staffUuid?: string;
  startDate?: string;
  endDate?: string;
  activityWasScheduled?: boolean;
}

const jobActivityCreate: ActionDefinition<Input, { uuid?: string }> = {
  key: "jobactivity-create",
  type: "perform",
  resource: "jobactivity",
  title: "Create Job Activity",
  description: "Schedule a booking or record time against a Job. Returns only the new UUID.",
  idempotent: false,
  params: [
    { key: "jobUuid", label: "Job UUID", type: "string" },
    { key: "staffUuid", label: "Staff UUID", type: "string" },
    { key: "startDate", label: "Start date/time", type: "datetime" },
    { key: "endDate", label: "End date/time", type: "datetime" },
    {
      key: "activityWasScheduled",
      label: "Was scheduled (vs. recorded time)",
      type: "boolean",
      default: true,
    },
  ],
  output: [{ key: "uuid", type: "string", label: "New Job Activity UUID (x-record-uuid)" }],

  async execute(input, ctx) {
    const { uuid } = await new ServiceM8Client(ctx).create(
      "/jobactivity.json",
      compact({
        job_uuid: input.jobUuid,
        staff_uuid: input.staffUuid,
        start_date: input.startDate,
        end_date: input.endDate,
        activity_was_scheduled: input.activityWasScheduled === undefined
          ? undefined
          : (input.activityWasScheduled ? "1" : "0"),
      }),
    );
    return { uuid };
  },
};

export default jobActivityCreate;
