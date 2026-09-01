import { assertEquals } from "@std/assert";
import dealDelete from "../../actions/deal-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("deal-delete: DELETEs /v2/deals/:id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await dealDelete.execute({ id: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/deals/1");
  assertEquals(calls[0].method, "DELETE");
});
