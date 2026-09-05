import { assertEquals } from "@std/assert";
import departmentList from "../../actions/department-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("department-list: lists company departments", async () => {
  const departments = [{ id: 1, name: "Engineering" }];
  const { ctx, calls } = mockCtx([{ status: 200, body: { departments } }]);
  const out = await departmentList.execute({}, ctx) as { departments: unknown };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/c/123/departments");
  assertEquals(out.departments, departments);
});
