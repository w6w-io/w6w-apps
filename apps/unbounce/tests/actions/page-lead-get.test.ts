import { assertEquals } from "@std/assert";
import pageLeadGet from "../../actions/page-lead-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("page-lead-get: calls GET /pages/{page_id}/leads/{lead_id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "l1", form_data: {} } }]);
  await pageLeadGet.execute({ pageId: "p1", leadId: "l1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/pages/p1/leads/l1");
});
