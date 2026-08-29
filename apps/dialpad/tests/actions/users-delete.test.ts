import { assertEquals } from "@std/assert";
import usersDelete from "../../actions/users-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("users-delete: DELETEs /users/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1", state: "deleted" } }]);
  const out = await usersDelete.execute({ userId: "1" }, ctx) as { state: string };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v2/users/1");
  assertEquals(out.state, "deleted");
});

Deno.test("users-delete: declared idempotent", () => {
  assertEquals(usersDelete.idempotent, true);
});
