import { assertEquals } from "@std/assert";
import usersList from "../../actions/users-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("users-list: GETs /users with filters, never sends a limit", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: page([{ id: "1" }]) }]);
  await usersList.execute({ firstName: "jo", state: "active" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/users");
  const q = queryOf(calls[0].url);
  assertEquals(q, { first_name: "jo", state: "active" });
  assertEquals("limit" in q, false);
});
