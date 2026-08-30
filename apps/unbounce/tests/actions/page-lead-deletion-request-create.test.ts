import { assertEquals } from "@std/assert";
import pageLeadDeletionRequestCreate from "../../actions/page-lead-deletion-request-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("page-lead-deletion-request-create: posts a lead_ids array parsed from a CSV string", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "req-1", status: "pending" } }]);
  await pageLeadDeletionRequestCreate.execute(
    { pageId: "p1", leadIds: "l1, l2 ,l3" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/pages/p1/lead_deletion_request");
  assertEquals(JSON.parse(calls[0].body!), { lead_ids: ["l1", "l2", "l3"] });
});

Deno.test("page-lead-deletion-request-create: all_leads mode omits lead_ids", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "req-1", status: "pending" } }]);
  await pageLeadDeletionRequestCreate.execute({ pageId: "p1", allLeads: true }, ctx);

  assertEquals(JSON.parse(calls[0].body!), { all_leads: true });
});
