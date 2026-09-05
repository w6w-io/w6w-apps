import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-enrollments-list.ts";

const conn = { display: { schoolDomain: "https://yourschool.learnworlds.com" } };

Deno.test("user-enrollments-list: GETs /v2/users/{id}/courses", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], meta: {} } }], conn);
  await action.execute!({ id: "1", page: 2 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/api/v2/users/1/courses");
  assertEquals(url.searchParams.get("page"), "2");
});
