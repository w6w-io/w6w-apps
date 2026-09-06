import type { ActionDefinition } from "@w6w/types";
import { entityPath, JibbleClient, TIME_TRACKING_HOST } from "../lib/client.ts";

/**
 * `PATCH /v1/TimeOffIntervals(id)` with `{"status": "..."}` — approve, reject, or cancel a
 * time-off request. Answers `204 No Content`.
 */
interface Input {
  timeOffId: string;
  status: "Approved" | "Rejected" | "Cancelled";
}

const timeOffUpdateStatus: ActionDefinition<Input> = {
  key: "time-off-update-status",
  type: "perform",
  resource: "time-off",
  title: "Approve/Reject/Cancel Time Off Request",
  description: "Change a time-off request's status.",
  idempotent: true,
  params: [
    { key: "timeOffId", label: "Time Off Request ID", type: "string", required: true },
    {
      key: "status",
      label: "New status",
      type: "select",
      required: true,
      options: [
        { value: "Approved", label: "Approve" },
        { value: "Rejected", label: "Reject" },
        { value: "Cancelled", label: "Cancel" },
      ],
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Updated" }],

  async execute(input, ctx) {
    if (!input.timeOffId) throw new Error("timeOffId is required");
    if (!input.status) throw new Error("status is required");
    const status = await new JibbleClient(ctx).status(
      TIME_TRACKING_HOST,
      entityPath("TimeOffIntervals", input.timeOffId),
      { method: "PATCH", body: { status: input.status } },
    );
    return { ok: status >= 200 && status < 300 };
  },
};

export default timeOffUpdateStatus;
