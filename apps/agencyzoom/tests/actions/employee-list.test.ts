import { assertEquals } from "@std/assert";
import employeeList from "../../actions/employee-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("employee-list: GET /employees, wraps the bare array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, firstname: "Jamie", isOwner: true }] }]);
  const result = await employeeList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/api/employees");
  assertEquals(result, { employees: [{ id: 1, firstname: "Jamie", isOwner: true }] });
});
