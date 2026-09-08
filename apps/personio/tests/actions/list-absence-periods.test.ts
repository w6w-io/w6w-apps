import { assertEquals } from "@std/assert";
import action from "../../actions/list-absence-periods.ts";
import { mockCtx, pathOf, queryAllOf } from "../_helpers.ts";

Deno.test("list-absence-periods: maps the hourly-absence shape, distinct from TimeOffPeriod", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        success: true,
        metadata: { total_elements: 1 },
        data: [
          {
            type: "AbsencePeriod",
            attributes: {
              id: "9bba303f-0fbc-4514-9958-0befa21923fb",
              measurement_unit: "hour",
              effective_duration: 960,
              employee: {
                type: "Employee",
                attributes: {
                  id: { label: "id", value: 2367, type: "integer", universal_id: "id" },
                },
              },
              absence_type: {
                type: "AbsenceType",
                attributes: { id: "abc", name: "Absence Type Name", time_off_type_id: 45678 },
              },
              start: "2022-05-31T22:00:00.0Z",
              end: "2022-06-02T22:00:00.0Z",
              status: "approved",
              breakdowns: [{ date: "2022-06-01", effective_duration: 480 }],
            },
          },
        ],
      },
    },
  ]);
  const out = await action.execute({}, ctx) as { absencePeriods: Array<Record<string, unknown>> };

  assertEquals(pathOf(calls[0].url), "/v1/company/absence-periods");
  const period = out.absencePeriods[0];
  // The id is a UUID string, unlike TimeOffPeriod's integer id.
  assertEquals(period.id, "9bba303f-0fbc-4514-9958-0befa21923fb");
  assertEquals(period.measurementUnit, "hour");
  assertEquals(period.effectiveDuration, 960);
  assertEquals((period.employee as Record<string, unknown>).id, 2367);
  assertEquals((period.absenceType as { name: string }).name, "Absence Type Name");
  assertEquals(Array.isArray(period.breakdowns), true);
});

Deno.test("list-absence-periods: repeats absence_types[] and employees[]", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true, data: [] } }]);
  await action.execute({ employeeIds: [1], absenceTypeIds: ["a", "b"] }, ctx);
  assertEquals(queryAllOf(calls[0].url, "employees[]"), ["1"]);
  assertEquals(queryAllOf(calls[0].url, "absence_types[]"), ["a", "b"]);
});
