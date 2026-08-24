import { assertEquals } from "@std/assert";
import campaignGet from "../../actions/campaign-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-get: fetches /api/mailing/campaigns/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "Welcome" } }]);
  const out = await campaignGet.execute({ id: "1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/mailing/campaigns/1");
  assertEquals(out, { id: 1, name: "Welcome" });
});
