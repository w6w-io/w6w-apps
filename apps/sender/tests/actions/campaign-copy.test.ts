import { assertEquals } from "@std/assert";
import campaignCopy from "../../actions/campaign-copy.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-copy: POSTs to /v2/campaigns/{id}/copy", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: { success: true, message: "Campaign duplicated", data: { id: "c2", status: "DRAFT" } },
    },
  ]);
  const out = await campaignCopy.execute({ id: "c1" }, ctx) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/campaigns/c1/copy");
  assertEquals(out.id, "c2");
});
