import { assertEquals, assertRejects } from "@std/assert";
import userUpdate from "../../actions/user-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-update: PATCHes only the fields given", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: 1, name: "New Name", email: "a@b.com" } },
  ]);
  await userUpdate.execute({ userId: 1, name: "New Name" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/users/1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { name: "New Name" });
});

Deno.test("user-update: is declared idempotent", () => {
  assertEquals(userUpdate.idempotent, true);
});

Deno.test("user-update: refuses a no-op call with neither field set", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await userUpdate.execute({ userId: 1 }, ctx),
    Error,
    "Set at least one",
  );
  assertEquals(calls.length, 0);
});
