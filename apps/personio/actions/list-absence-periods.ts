import type { ActionDefinition } from "@w6w/types";
import { compact, flattenAttributes, requestJson } from "../lib/client.ts";

/**
 * `GET /company/absence-periods` — absence periods for absence types whose **time unit is
 * hours**. This is a genuinely different resource from `/company/time-offs`'s
 * `TimeOffPeriod`, not just a rename: the id is a UUID string (not an integer),
 * `effective_duration`/`measurement_unit` replace `days_count`, `start`/`end` (full
 * timestamps) replace `start_date`/`end_date`, the type relationship is `absence_type`
 * (not `time_off_type`), and each period carries a `breakdowns` array of per-day minute
 * totals that `time-offs` has no equivalent of. Writing (`POST`) is not covered by this
 * app — see the README.
 */
interface Input {
  startDate?: string;
  endDate?: string;
  updatedFrom?: string;
  updatedTo?: string;
  employeeIds?: number[];
  absenceTypeIds?: string[];
  limit?: number;
  offset?: number;
}

interface AbsencePeriodResource {
  attributes?: {
    id?: string;
    measurement_unit?: string;
    effective_duration?: number;
    employee?: { attributes?: Record<string, { value?: unknown }> };
    absence_type?: { attributes?: { id?: string; name?: string; time_off_type_id?: number } };
    certificate?: { status?: string };
    start?: string;
    end?: string;
    half_day_start?: boolean;
    half_day_end?: boolean;
    comment?: string;
    origin?: string;
    status?: string;
    created_by?: number | string;
    created_at?: string;
    updated_at?: string;
    approved_at?: string;
    breakdowns?: Array<{ date?: string; effective_duration?: number }>;
  };
}

interface AbsencePeriodsResponse {
  metadata?: { total_elements?: number; current_page?: number; total_pages?: number };
  data?: AbsencePeriodResource[];
}

const listAbsencePeriods: ActionDefinition<Input, unknown> = {
  key: "list-absence-periods",
  type: "read",
  resource: "absence",
  title: "List Absence Periods",
  description: 'Absence periods for absence types with time unit "hours". For day-unit ' +
    "absences, use List Time-Offs instead.",
  params: [
    { key: "startDate", label: "Start date", type: "date", row: "range" },
    { key: "endDate", label: "End date", type: "date", row: "range" },
    { key: "updatedFrom", label: "Updated from", type: "datetime", advanced: true },
    { key: "updatedTo", label: "Updated to", type: "datetime", advanced: true },
    { key: "employeeIds", label: "Employee IDs", type: "number", repeat: true, advanced: true },
    {
      key: "absenceTypeIds",
      label: "Absence type IDs",
      type: "string",
      repeat: true,
      advanced: true,
    },
    { key: "limit", label: "Limit", type: "number", default: 200, row: "page" },
    { key: "offset", label: "Offset", type: "number", default: 0, row: "page" },
  ],
  output: [
    { key: "absencePeriods", type: "array", label: "Absence periods (hourly)" },
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
      absence_types: input.absenceTypeIds,
      limit: input.limit,
      offset: input.offset,
    });
    const res = await requestJson<AbsencePeriodsResponse>(ctx, "/company/absence-periods", {
      query,
    });
    const absencePeriods = (res.data ?? []).map((p) => {
      const a = p.attributes;
      return {
        id: a?.id,
        measurementUnit: a?.measurement_unit,
        effectiveDuration: a?.effective_duration,
        employee: flattenAttributes(a?.employee?.attributes),
        absenceType: a?.absence_type?.attributes,
        certificateStatus: a?.certificate?.status,
        start: a?.start,
        end: a?.end,
        halfDayStart: a?.half_day_start,
        halfDayEnd: a?.half_day_end,
        comment: a?.comment,
        origin: a?.origin,
        status: a?.status,
        createdBy: a?.created_by,
        createdAt: a?.created_at,
        updatedAt: a?.updated_at,
        approvedAt: a?.approved_at,
        breakdowns: a?.breakdowns,
      };
    });
    return {
      absencePeriods,
      totalElements: res.metadata?.total_elements,
      totalPages: res.metadata?.total_pages,
    };
  },
};

export default listAbsencePeriods;
