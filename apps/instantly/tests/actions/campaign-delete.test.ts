import { assertEquals } from "@std/assert";
import campaignDelete from "../../actions/campaign-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-delete: DELETEs /campaigns/{id} and returns the deleted entity", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1", name: "Gone" } }]);
  const out = await campaignDelete.execute({ id: "c1" }, ctx) as { id: string };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v2/campaigns/c1");
  assertEquals(out.id, "c1");
});
