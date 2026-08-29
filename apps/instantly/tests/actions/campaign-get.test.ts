import { assertEquals } from "@std/assert";
import campaignGet from "../../actions/campaign-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-get: GETs /campaigns/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1", name: "My Campaign" } }]);
  const out = await campaignGet.execute({ id: "c1" }, ctx) as { id: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/campaigns/c1");
  assertEquals(out.id, "c1");
});

Deno.test("campaign-get: URL-encodes the id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await campaignGet.execute({ id: "has space" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/campaigns/has%20space");
});
