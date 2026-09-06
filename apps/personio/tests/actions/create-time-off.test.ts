import { assertEquals } from "@std/assert";
import action from "../../actions/create-time-off.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-time-off: posts application/x-www-form-urlencoded, NOT JSON", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        success: true,
        data: { type: "TimeOffPeriod", attributes: { id: 1, status: "approved" } },
      },
    },
  ]);

  await action.execute(
    { employeeId: 42, timeOffTypeId: 7, startDate: "2026-01-01", endDate: "2026-01-02" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/company/time-offs");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("employee_id"), "42");
  assertEquals(form.get("time_off_type_id"), "7");
  assertEquals(form.get("start_date"), "2026-01-01");
  // JSON.stringify would have been the wrong shape entirely — this proves it wasn't sent.
  assertEquals(calls[0].body!.startsWith("{"), false);
});

Deno.test("create-time-off: flattens the created TimeOffPeriod in the response", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {
        success: true,
        data: { type: "TimeOffPeriod", attributes: { id: 99, status: "approved" } },
      },
    },
  ]);
  const out = await action.execute(
    { employeeId: 1, timeOffTypeId: 1, startDate: "2026-01-01", endDate: "2026-01-01" },
    ctx,
  ) as { timeOff: { id: number } };
  assertEquals(out.timeOff.id, 99);
});
