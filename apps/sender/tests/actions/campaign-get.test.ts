import { assertEquals } from "@std/assert";
import campaignGet from "../../actions/campaign-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-get: GETs /v2/campaigns/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "c1", status: "SENT" } } }]);
  const out = await campaignGet.execute({ id: "c1" }, ctx) as { status: string };

  assertEquals(pathOf(calls[0].url), "/v2/campaigns/c1");
  assertEquals(out.status, "SENT");
});
