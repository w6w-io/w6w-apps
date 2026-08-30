import { assertEquals } from "@std/assert";
import membershipPause from "../../actions/membership-pause.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("membership-pause: POSTs an optional until timestamp", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "mem_1", status: "active" } }]);
  await membershipPause.execute({ membershipId: "mem_1", until: "2026-09-01T00:00:00.000Z" }, ctx);

  assertEquals(pathOf(calls[0].url), "/memberships/mem_1/pause");
  assertEquals(JSON.parse(calls[0].body!), { until: "2026-09-01T00:00:00.000Z" });
});

Deno.test("membership-pause: an absent until sends an empty JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "mem_1" } }]);
  await membershipPause.execute({ membershipId: "mem_1" }, ctx);
  assertEquals(calls[0].body, "{}");
});
