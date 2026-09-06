import { assertEquals } from "@std/assert";
import action from "../../actions/list-time-offs.ts";
import { mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

const samplePeriod = {
  type: "TimeOffPeriod",
  attributes: {
    // Top-level TimeOffPeriod fields are PLAIN scalars, unlike an Employee response.
    id: 12345,
    status: "approved",
    start_date: "2017-12-27T00:00:00+0100",
    end_date: "2017-12-29T00:00:00+0100",
    days_count: 3,
    half_day_start: false,
    half_day_end: false,
    time_off_type: {
      type: "TimeOffType",
      attributes: { id: 54321, name: "Vacation", category: "offsite_work" },
    },
    // ...but the embedded employee relationship IS wrapped per field, like a standalone Employee.
    employee: {
      type: "Employee",
      attributes: {
        id: { label: "id", value: 4567, type: "integer", universal_id: "id" },
        first_name: {
          label: "First name",
          value: "Michael",
          type: "standard",
          universal_id: "first_name",
        },
      },
    },
    certificate: { status: "not-required" },
    created_at: "2017-01-17T10:32:18+0100",
    updated_at: "2017-01-17T10:32:18+0100",
  },
};

Deno.test("list-time-offs: flattens the mixed wrapped/unwrapped TimeOffPeriod shape", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { success: true, metadata: { total_elements: 1 }, data: [samplePeriod] } },
  ]);
  const out = await action.execute({}, ctx) as { timeOffs: Array<Record<string, unknown>> };

  assertEquals(pathOf(calls[0].url), "/v1/company/time-offs");
  const period = out.timeOffs[0] as {
    id: number;
    daysCount: number;
    timeOffType: { name: string };
    employee: Record<string, unknown>;
  };
  // Top-level fields read straight off (unwrapped).
  assertEquals(period.id, 12345);
  assertEquals(period.daysCount, 3);
  assertEquals(period.timeOffType.name, "Vacation");
  // The nested employee IS unwrapped from its per-field label/value wrapper.
  assertEquals(period.employee.first_name, "Michael");
  assertEquals(period.employee.id, 4567);
});

Deno.test("list-time-offs: repeats employees[] and forwards the date range", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true, data: [] } }]);
  await action.execute(
    { employeeIds: [1, 2], startDate: "2026-01-01", endDate: "2026-01-31" },
    ctx,
  );
  assertEquals(queryAllOf(calls[0].url, "employees[]"), ["1", "2"]);
  assertEquals(queryOf(calls[0].url).start_date, "2026-01-01");
});
