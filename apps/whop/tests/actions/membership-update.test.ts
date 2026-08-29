import { assertEquals } from "@std/assert";
import membershipUpdate from "../../actions/membership-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("membership-update: PATCHes cancelAtPeriodEnd and metadata", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "mem_1", cancel_at_period_end: true } }]);
  await membershipUpdate.execute(
    { membershipId: "mem_1", cancelAtPeriodEnd: true, metadata: { seat: "42" } },
    ctx,
  );

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/memberships/mem_1");
  assertEquals(JSON.parse(calls[0].body!), {
    cancel_at_period_end: true,
    metadata: { seat: "42" },
  });
});

Deno.test("membership-update: metadata accepts the JSON-string form a user types", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "mem_1" } }]);
  await membershipUpdate.execute({ membershipId: "mem_1", metadata: '{"seat":"7"}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).metadata, { seat: "7" });
});

Deno.test("membership-update: is declared idempotent (PATCH is a full overwrite)", () => {
  assertEquals(membershipUpdate.idempotent, true);
});
