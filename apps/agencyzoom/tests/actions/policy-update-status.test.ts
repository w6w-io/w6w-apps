import { assertEquals } from "@std/assert";
import policyUpdateStatus from "../../actions/policy-update-status.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("policy-update-status: POSTs {policyId, status} to /policies/update-status", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "ok" } }]);
  await policyUpdateStatus.execute({ policyId: 7, status: 0 }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/api/policies/update-status");
  assertEquals(JSON.parse(calls[0].body!), { policyId: 7, status: 0 });
});

Deno.test("policy-update-status: is declared idempotent", () => {
  assertEquals(policyUpdateStatus.idempotent, true);
});
