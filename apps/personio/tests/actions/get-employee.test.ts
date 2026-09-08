import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-employee.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-employee: fetches by id and flattens the response", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        success: true,
        data: {
          type: "Employee",
          attributes: {
            email: { label: "Email", value: "a@b.com", type: "standard", universal_id: "email" },
          },
        },
      },
    },
  ]);
  const out = await action.execute({ employeeId: 42 }, ctx) as {
    employee: Record<string, unknown>;
  };
  assertEquals(pathOf(calls[0].url), "/v1/company/employees/42");
  assertEquals(out.employee.email, "a@b.com");
});

Deno.test("get-employee: surfaces the documented 403 (invalid auth) message", async () => {
  const { ctx } = mockCtx([
    {
      status: 403,
      body: {
        success: false,
        error: { code: 403, message: "Provided authorization is not valid" },
      },
    },
  ]);
  await assertRejects(
    async () => await action.execute({ employeeId: 1 }, ctx),
    Error,
    "Provided authorization is not valid",
  );
});
