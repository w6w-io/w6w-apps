import { assertEquals, assertRejects } from "@std/assert";
import memberRemove from "../../actions/member-remove.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("member-remove: removes by email", async () => {
  const { ctx, calls } = mockCtx([
    { body: { success: true, userId: "user_1", hasBillingCycleUsage: true } },
  ]);
  const out = await memberRemove.execute({ email: "a@co.com" }, ctx) as { success: boolean };
  assertEquals(pathOf(calls[0].url), "/teams/remove-member");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@co.com" });
  assertEquals(out.success, true);
});

Deno.test("member-remove: removes by userId", async () => {
  const { ctx, calls } = mockCtx([
    { body: { success: true, userId: "user_1", hasBillingCycleUsage: false } },
  ]);
  await memberRemove.execute({ userId: "user_1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { userId: "user_1" });
});

Deno.test("member-remove: rejects when neither email nor userId is given", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await memberRemove.execute({}, ctx));
});

Deno.test("member-remove: rejects when both email and userId are given", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () =>
    await memberRemove.execute({ email: "a@co.com", userId: "user_1" }, ctx)
  );
});
