import { assertEquals } from "@std/assert";
import campaignDelete from "../../actions/campaign-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-delete: DELETEs /api/mailing/campaigns/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await campaignDelete.execute({ id: "1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/mailing/campaigns/1");
  assertEquals(out, { status: 204 });
});
