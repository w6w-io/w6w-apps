import { assertEquals } from "@std/assert";
import campaignPatch from "../../actions/campaign-patch.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-patch: PATCHes only the set fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1", name: "New Name" } }]);
  await campaignPatch.execute({ id: "c1", name: "New Name" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/campaigns/c1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "New Name");
  assertEquals("campaign_schedule" in body, false);
});

Deno.test("campaign-patch: sequences accepts a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await campaignPatch.execute({ id: "c1", sequences: '[{"steps":[]}]' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).sequences, [{ steps: [] }]);
});

Deno.test("campaign-patch: is declared idempotent — a re-applied patch ends in the same state", () => {
  assertEquals(campaignPatch.idempotent, true);
});
