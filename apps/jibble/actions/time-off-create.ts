import type { ActionDefinition } from "@w6w/types";
import { JibbleClient, TIME_TRACKING_HOST } from "../lib/client.ts";

/**
 * `POST /v1/TimeOffIntervals` — request time off.
 *
 * Jibble's own examples show two shapes sharing one endpoint: a `FullDay`/multi-day request
 * carries `startDate`/`endDate`, while an `Hours` (partial-day) request carries
 * `startTime`/`endTime` instead — the field names differ by kind, they aren't just optional
 * variants of each other.
 */
interface Input {
  personId: string;
  policyId: string;
  kind: "FullDay" | "Hours";
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  note?: string;
}

const timeOffCreate: ActionDefinition<Input> = {
  key: "time-off-create",
  type: "perform",
  resource: "time-off",
  title: "Create Time Off Request",
  description: "Request time off for a member, against one of the organization's policies.",
  idempotent: false,
  params: [
    { key: "personId", label: "Person ID", type: "string", required: true },
    { key: "policyId", label: "Time Off Policy ID", type: "string", required: true },
    {
      key: "kind",
      label: "Kind",
      type: "select",
      required: true,
      default: "FullDay",
      options: [
        { value: "FullDay", label: "Full day(s) — uses Start/End date" },
        { value: "Hours", label: "Partial day — uses Start/End time" },
      ],
    },
    {
      key: "startDate",
      label: "Start date",
      type: "date",
      hint: "Required for a Full day(s) request. YYYY-MM-DD.",
      showIf: { "==": [{ var: "kind" }, "FullDay"] },
    },
    {
      key: "endDate",
      label: "End date",
      type: "date",
      hint: "Required for a Full day(s) request. YYYY-MM-DD.",
      showIf: { "==": [{ var: "kind" }, "FullDay"] },
    },
    {
      key: "startTime",
      label: "Start time",
      type: "datetime",
      hint: "Required for a Partial day request. ISO 8601 with time.",
      showIf: { "==": [{ var: "kind" }, "Hours"] },
    },
    {
      key: "endTime",
      label: "End time",
      type: "datetime",
      hint: "Required for a Partial day request. ISO 8601 with time.",
      showIf: { "==": [{ var: "kind" }, "Hours"] },
    },
    { key: "note", label: "Note", type: "text" },
  ],
  output: [
    { key: "id", type: "string", label: "Time off request ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    if (!input.personId) throw new Error("personId is required");
    if (!input.policyId) throw new Error("policyId is required");
    const kind = input.kind ?? "FullDay";

    if (kind === "FullDay" && (!input.startDate || !input.endDate)) {
      throw new Error("startDate and endDate are required for a FullDay request");
    }
    if (kind === "Hours" && (!input.startTime || !input.endTime)) {
      throw new Error("startTime and endTime are required for an Hours request");
    }

    return await new JibbleClient(ctx).json(TIME_TRACKING_HOST, "/v1/TimeOffIntervals", {
      method: "POST",
      body: {
        personId: input.personId,
        policyId: input.policyId,
        note: input.note || undefined,
        ...(kind === "FullDay"
          ? { startDate: input.startDate, endDate: input.endDate }
          : { startTime: input.startTime, endTime: input.endTime }),
      },
    });
  },
};

export default timeOffCreate;
