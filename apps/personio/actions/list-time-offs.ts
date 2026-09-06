import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  flattenTimeOffPeriod,
  requestJson,
  type TimeOffPeriodResource,
} from "../lib/client.ts";

/**
 * `GET /company/time-offs` — absence periods for absence types whose **time unit is
 * days**. For hourly absence types use "List Absence Periods" instead — Personio splits
 * these into two separate endpoints with separate response shapes.
 */
interface Input {
  startDate?: string;
  endDate?: string;
  updatedFrom?: string;
  updatedTo?: string;
  employeeIds?: number[];
  limit?: number;
  offset?: number;
}

interface TimeOffsResponse {
  metadata?: { total_elements?: number; current_page?: number; total_pages?: number };
  data?: TimeOffPeriodResource[];
}

const listTimeOffs: ActionDefinition<Input, unknown> = {
  key: "list-time-offs",
  type: "read",
  resource: "absence",
  title: "List Time-Offs",
  description: 'Absence periods for absence types with time unit "days". For hourly ' +
    "absence types, use List Absence Periods instead.",
  params: [
    { key: "startDate", label: "Start date", type: "date", row: "range" },
    { key: "endDate", label: "End date", type: "date", row: "range" },
    { key: "updatedFrom", label: "Updated from", type: "date", advanced: true },
    { key: "updatedTo", label: "Updated to", type: "date", advanced: true },
    {
      key: "employeeIds",
      label: "Employee IDs",
      type: "number",
      repeat: true,
      advanced: true,
    },
    { key: "limit", label: "Limit", type: "number", default: 200, row: "page" },
    { key: "offset", label: "Offset", type: "number", default: 0, row: "page" },
  ],
  output: [
    { key: "timeOffs", type: "array", label: "Time-off periods" },
    { key: "totalElements", type: "number", label: "Total elements" },
    { key: "totalPages", type: "number", label: "Total pages" },
  ],

  async execute(input, ctx) {
    const query = compact({
      start_date: input.startDate,
      end_date: input.endDate,
      updated_from: input.updatedFrom,
      updated_to: input.updatedTo,
      employees: input.employeeIds,
      limit: input.limit,
      offset: input.offset,
    });
    const res = await requestJson<TimeOffsResponse>(ctx, "/company/time-offs", { query });
    return {
      timeOffs: (res.data ?? []).map(flattenTimeOffPeriod),
      totalElements: res.metadata?.total_elements,
      totalPages: res.metadata?.total_pages,
    };
  },
};

export default listTimeOffs;
