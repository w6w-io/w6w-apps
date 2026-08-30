import { assertEquals } from "@std/assert";
import pageLeadDeletionRequestGet from "../../actions/page-lead-deletion-request-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("page-lead-deletion-request-get: calls GET .../lead_deletion_request/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "req-1", status: "completed" } }]);
  const out = await pageLeadDeletionRequestGet.execute(
    { pageId: "p1", leadDeletionRequestId: "req-1" },
    ctx,
  ) as { status: string };

  assertEquals(pathOf(calls[0].url), "/pages/p1/lead_deletion_request/req-1");
  assertEquals(out.status, "completed");
});
