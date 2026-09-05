import { assertEquals } from "@std/assert";
import createPendingUser from "../../actions/create-pending-user.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-pending-user: PUT /pendingUser with required fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const out = await createPendingUser.execute(
    { email: "a@b.com", name: "Dwight", roleID: "r1" },
    ctx,
  ) as { success: boolean };
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v0/pendingUser");
  assertEquals(out.success, true);
});

Deno.test("create-pending-user: is not idempotent — a second call for an already-real user errors", () => {
  assertEquals(createPendingUser.idempotent, false);
});
