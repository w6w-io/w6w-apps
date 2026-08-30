import { assertEquals } from "@std/assert";
import membershipGet from "../../actions/membership-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("membership-get: GETs /memberships/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "mem_1", status: "active" } }]);
  const out = await membershipGet.execute({ membershipId: "mem_1" }, ctx) as { id: string };

  assertEquals(pathOf(calls[0].url), "/memberships/mem_1");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.id, "mem_1");
});

Deno.test("membership-get: accepts a license key in place of an ID", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "mem_2" } }]);
  await membershipGet.execute({ membershipId: "WHOP-XXXX-XXXX-XXXX" }, ctx);
  assertEquals(pathOf(calls[0].url), "/memberships/WHOP-XXXX-XXXX-XXXX");
});
