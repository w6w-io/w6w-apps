import { assertEquals } from "@std/assert";
import { mockFreshsalesCtx } from "../_helpers.ts";
import action from "../../actions/deal-delete.ts";

Deno.test("deal-delete: DELETEs /deals/:id and reads the bare `true` body", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: "true" }]);
  const out = await action.execute({ dealId: 1 }, ctx);
  assertEquals(calls[0].url, "https://acme.myfreshworks.com/crm/sales/api/deals/1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { deleted: true });
});
