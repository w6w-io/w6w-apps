import { assertEquals } from "@std/assert";
import leadBulkDelete from "../../actions/lead-bulk-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-bulk-delete: DELETEs /leads with the filter body", async () => {
  const { ctx, calls } = mockCtx([{ body: { count: 3 } }]);
  const out = await leadBulkDelete.execute(
    { campaign_id: "c1", status: 3, limit: 100 },
    ctx,
  ) as { count: number };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v2/leads");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.campaign_id, "c1");
  assertEquals(body.status, 3);
  assertEquals(out.count, 3);
});

Deno.test("lead-bulk-delete: ids accepts a comma string", async () => {
  const { ctx, calls } = mockCtx([{ body: { count: 0 } }]);
  await leadBulkDelete.execute({ list_id: "list1", ids: "a,b" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).ids, ["a", "b"]);
});

Deno.test("lead-bulk-delete: is declared idempotent — the end state is the same either way", () => {
  assertEquals(leadBulkDelete.idempotent, true);
});
