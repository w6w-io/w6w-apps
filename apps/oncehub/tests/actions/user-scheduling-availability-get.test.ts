import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-scheduling-availability-get.ts";

Deno.test("user-scheduling-availability-get: GETs /users/{id}/scheduling-availability", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "schedule", weekly: [] } }]);
  await action.execute({ id: "USR-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/users/USR-1/scheduling-availability");
  assertEquals(calls[0].method, "GET");
});
