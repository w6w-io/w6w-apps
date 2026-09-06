import type { ActionDefinition } from "@w6w/types";
import { flattenTimeOffPeriod, requestJson, type TimeOffPeriodResource } from "../lib/client.ts";

/** `GET /company/time-offs/{id}` — a single day-unit absence period by id. */
interface Input {
  id: number;
}

interface TimeOffResponse {
  data?: TimeOffPeriodResource;
}

const getTimeOff: ActionDefinition<Input, unknown> = {
  key: "get-time-off",
  type: "read",
  resource: "absence",
  title: "Get Time-Off",
  description: "Get a single day-unit absence period by its id.",
  params: [
    { key: "id", label: "Time-off ID", type: "number", required: true },
  ],
  output: [
    { key: "timeOff", type: "object", label: "Time-off period" },
  ],

  async execute(input, ctx) {
    const res = await requestJson<TimeOffResponse>(
      ctx,
      `/company/time-offs/${encodeURIComponent(String(input.id))}`,
    );
    return { timeOff: flattenTimeOffPeriod(res.data) };
  },
};

export default getTimeOff;
