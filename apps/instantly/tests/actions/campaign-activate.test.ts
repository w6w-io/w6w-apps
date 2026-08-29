import { assertEquals } from "@std/assert";
import campaignActivate from "../../actions/campaign-activate.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-activate: POSTs /campaigns/{id}/activate", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1", status: 1 } }]);
  const out = await campaignActivate.execute({ id: "c1" }, ctx) as { status: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/campaigns/c1/activate");
  assertEquals(out.status, 1);
});
