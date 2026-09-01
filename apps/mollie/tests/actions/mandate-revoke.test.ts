import { assertEquals } from "@std/assert";
import mandateRevoke from "../../actions/mandate-revoke.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("mandate-revoke: sends DELETE to /customers/{id}/mandates/{mandateId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await mandateRevoke.execute({ customerId: "cst_1", mandateId: "mdt_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/customers/cst_1/mandates/mdt_1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { mandateId: "mdt_1", revoked: true });
});
