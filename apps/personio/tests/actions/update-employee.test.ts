import { assertEquals } from "@std/assert";
import action from "../../actions/update-employee.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("update-employee: PATCHes only the fields provided", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { success: true, data: { message: "updated" } } },
  ]);

  const out = await action.execute({ employeeId: 42, firstName: "New Name" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/company/employees/42");
  assertEquals(calls[0].method, "PATCH");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { employee: { first_name: "New Name" } });
  assertEquals(out, { message: "updated" });
});

Deno.test("update-employee: never sends an email field — the endpoint does not accept one", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true, data: {} } }]);
  await action.execute({ employeeId: 1, firstName: "X" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("email" in body.employee, false);
});
