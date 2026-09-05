import { assertEquals } from "@std/assert";
import campaignDelete from "../../actions/campaign-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-delete: DELETEs /campaigns/{id} and returns the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await campaignDelete.execute({ id: "12345" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/campaigns/12345");
  assertEquals(out, { status: 200 });
});
