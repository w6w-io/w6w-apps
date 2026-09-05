import { assertEquals } from "@std/assert";
import customerPolicyList, { normalizePolicies } from "../../actions/customer-policy-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-policy-list: GET /customers/{customerId}/policies", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, policyNumber: "P-1" }] }]);
  const result = await customerPolicyList.execute({ customerId: 55 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/api/customers/55/policies");
  assertEquals(result, { policies: [{ id: 1, policyNumber: "P-1" }] });
});

/**
 * The documented response schema for this endpoint is a single flat object,
 * not an array — see the action's own doc comment. This is the case that
 * would silently break if the action trusted the OpenAPI document's shape
 * literally.
 */
Deno.test("customer-policy-list: a single flat object (the documented schema) normalizes to a one-item array", async () => {
  const { ctx } = mockCtx([{ body: { id: 1, policyNumber: "P-1" } }]);
  const result = await customerPolicyList.execute({ customerId: 55 }, ctx);
  assertEquals(result, { policies: [{ id: 1, policyNumber: "P-1" }] });
});

Deno.test("normalizePolicies: handles a bare array, a {policies:[]} wrapper, a bare object, and empty", () => {
  assertEquals(normalizePolicies([{ id: 1 }]), [{ id: 1 }]);
  assertEquals(normalizePolicies({ policies: [{ id: 2 }] }), [{ id: 2 }]);
  assertEquals(normalizePolicies({ id: 3 }), [{ id: 3 }]);
  assertEquals(normalizePolicies({}), []);
  assertEquals(normalizePolicies(null), []);
  assertEquals(normalizePolicies(undefined), []);
});
