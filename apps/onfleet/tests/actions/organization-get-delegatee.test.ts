import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-get-delegatee.ts";

Deno.test("organization-get-delegatee: fetches by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "org_2", name: "Partner" } }]);
  await action.execute!({ organizationId: "org_2" }, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/organizations/org_2");
});

Deno.test("organization-get-delegatee: organizationId is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "organizationId");
  assertEquals(calls.length, 0);
});
