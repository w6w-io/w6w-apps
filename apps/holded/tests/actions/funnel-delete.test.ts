import { assertEquals } from "@std/assert";
import funnelDelete from "../../actions/funnel-delete.ts";
import { asMutation, mockCtx, pathOf, writeResult } from "../_helpers.ts";

Deno.test("funnel-delete: metadata — idempotent", () => {
  assertEquals(funnelDelete.type, "perform");
  assertEquals(funnelDelete.idempotent, true);
});

Deno.test("funnel-delete: DELETE /funnels/{funnelId}, no body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: writeResult("Successfully deleted", "f1"),
  }]);
  const result = asMutation(await funnelDelete.execute({ funnelId: "f1" }, ctx));
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/crm/v1/funnels/f1");
  assertEquals(calls[0].body, null);
  assertEquals(result.info, "Successfully deleted");
});
