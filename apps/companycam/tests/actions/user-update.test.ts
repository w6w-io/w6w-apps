import { assert, assertEquals, assertRejects } from "@std/assert";
import userUpdate from "../../actions/user-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

/**
 * The body is FLAT here and nested on create — the vendor's own asymmetry. A
 * nested body would be accepted and would change nothing.
 */
Deno.test("user-update: sends a flat body, unlike create", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "9" } }]);
  await userUpdate.execute({ userId: "9", firstName: "Burton", lastName: "Guster" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/users/9");
  assertEquals(calls[0].method, "PUT");
  assertEquals(bodyOf(calls[0]), { first_name: "Burton", last_name: "Guster" });
  assertEquals(bodyOf(calls[0]).user, undefined, "the update body must not be nested");
});

Deno.test("user-update: refuses an empty update", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await userUpdate.execute({ userId: "9" }, ctx),
    Error,
    "Nothing to update",
  );
  assertEquals(calls.length, 0);
});

Deno.test("user-update: offers no role, because the vendor's body carries none", () => {
  const keys = userUpdate.params!.map((p) => p.key);
  assert(!keys.includes("userRole"), "offered a role change this endpoint does not support");
});
