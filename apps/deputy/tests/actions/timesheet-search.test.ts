import { assertEquals } from "@std/assert";
import action from "../../actions/timesheet-search.ts";
import { BASE_URL, mockCtx } from "../_helpers.ts";

Deno.test("timesheet-search: POSTs a date-range search to /resource/Timesheet/QUERY", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: [{ Id: 1 }] }],
    { display: { baseUrl: BASE_URL } },
  );
  const out = await action.execute({
    search: '{"s1":{"field":"StartTime","data":1758384000,"type":"ge"}}',
    join: "EmployeeObject,OperationalUnitObject",
  }, ctx) as { items: unknown[] };
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/resource/Timesheet/QUERY`);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.search, { s1: { field: "StartTime", data: 1758384000, type: "ge" } });
  assertEquals(body.join, ["EmployeeObject", "OperationalUnitObject"]);
  assertEquals(out.items, [{ Id: 1 }]);
});
