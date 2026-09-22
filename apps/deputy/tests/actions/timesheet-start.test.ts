import { assertEquals } from "@std/assert";
import action from "../../actions/timesheet-start.ts";
import { BASE_URL, mockCtx } from "../_helpers.ts";

Deno.test("timesheet-start: POSTs intEmployeeId/intOpunitId to /supervise/timesheet/start", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { Id: 100 } }],
    { display: { baseUrl: BASE_URL } },
  );
  const out = await action.execute({ intEmployeeId: 3, intOpunitId: 1 }, ctx);
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/supervise/timesheet/start`);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { intEmployeeId: 3, intOpunitId: 1 });
  assertEquals(out, { response: { Id: 100 } });
});

Deno.test("timesheet-start: is explicitly not idempotent — no idempotency key exists", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("timesheet-start: both fields are required integers", () => {
  const byKey = Object.fromEntries(action.params!.map((p) => [p.key, p]));
  assertEquals(byKey.intEmployeeId.required, true);
  assertEquals(byKey.intOpunitId.required, true);
});
