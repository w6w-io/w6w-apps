import { assertEquals } from "@std/assert";
import pageLeadDelete from "../../actions/page-lead-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("page-lead-delete: calls DELETE /pages/{page_id}/leads/{lead_id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await pageLeadDelete.execute({ pageId: "p1", leadId: "l1" }, ctx) as {
    status: number;
  };

  assertEquals(pathOf(calls[0].url), "/pages/p1/leads/l1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out.status, 204);
});

Deno.test("page-lead-delete: marked idempotent and warns it is OAuth-only", () => {
  assertEquals(pageLeadDelete.idempotent, true);
  assertEquals(/OAuth/.test(pageLeadDelete.description ?? ""), true);
});
