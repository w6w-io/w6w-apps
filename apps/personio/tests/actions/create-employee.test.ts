import { assertEquals } from "@std/assert";
import action from "../../actions/create-employee.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-employee: posts a JSON body nested under 'employee' and returns id/message", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { success: true, data: { id: 81723, message: "success" } } },
  ]);

  const out = await action.execute(
    { email: "john@demo.com", firstName: "John", lastName: "Dou", hireDate: "2020-01-31" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/company/employees");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    employee: {
      email: "john@demo.com",
      first_name: "John",
      last_name: "Dou",
      hire_date: "2020-01-31",
    },
  });
  assertEquals(out, { id: 81723, message: "success" });
});

Deno.test("create-employee: omits unset optional fields rather than sending them empty", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true, data: { id: 1 } } }]);
  await action.execute({ email: "a@b.com", firstName: "A", lastName: "B" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("supervisor_id" in body.employee, false);
  assertEquals("department" in body.employee, false);
});
