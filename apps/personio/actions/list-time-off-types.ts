import type { ActionDefinition } from "@w6w/types";
import { compact, requestJson } from "../lib/client.ts";

/**
 * `GET /company/time-off-types` — absence types whose **time unit** is `day` or `hour`
 * (e.g. "Paid vacation", "Home office"). The `id` this returns is the `timeOffTypeId` that
 * "Create Time-Off" requires.
 */
interface Input {
  limit?: number;
  offset?: number;
}

interface TimeOffTypeResource {
  attributes?: {
    id?: number;
    name?: string;
    category?: string;
    unit?: string;
    approval_required?: boolean;
  };
}

interface TimeOffTypesResponse {
  data?: TimeOffTypeResource[];
}

const listTimeOffTypes: ActionDefinition<Input, unknown> = {
  key: "list-time-off-types",
  type: "read",
  resource: "absence",
  title: "List Time-Off Types",
  description: 'Absence types with time unit "days" or "hours" (e.g. Paid vacation, Home ' +
    "office). Returns the id Create Time-Off needs.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 200, row: "page" },
    { key: "offset", label: "Offset", type: "number", default: 0, row: "page" },
  ],
  output: [
    { key: "timeOffTypes", type: "array", label: "Time-off types" },
  ],

  async execute(input, ctx) {
    const query = compact({ limit: input.limit, offset: input.offset });
    const res = await requestJson<TimeOffTypesResponse>(ctx, "/company/time-off-types", {
      query,
    });
    const timeOffTypes = (res.data ?? []).map((t) => ({
      id: t.attributes?.id,
      name: t.attributes?.name,
      category: t.attributes?.category,
      unit: t.attributes?.unit,
      approvalRequired: t.attributes?.approval_required,
    }));
    return { timeOffTypes };
  },
};

export default listTimeOffTypes;
