import { assertEquals } from "@std/assert";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/member-list.ts";

Deno.test("member-list: GETs the organization's members", async () => {
  const body = listEnvelope("members", [{ user_id: 651956, membership_role: "owner" }]);
  const { ctx, calls } = mockCtx([{ status: 200, body }]);
  const result = await action.execute!({ organization_id: 13 }, ctx) as typeof body;

  assertEquals(pathOf(calls[0].url), "/v2/organizations/13/members");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(result.members[0].user_id, 651956);
});

/** Nested Hubstaff filters are literal bracket query keys, not objects. */
Deno.test("member-list: search[email] and search[name] are bracketed query keys", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope("members", []) }]);
  await action.execute!({
    organization_id: 13,
    search_email: "a@example.com",
    search_name: "Alex",
  }, ctx);
  const raw = new URL(calls[0].url).search;
  assertEquals(raw, "?search%5Bemail%5D=a%40example.com&search%5Bname%5D=Alex");
  assertEquals(queryOf(calls[0].url)["search[email]"], "a@example.com");
});

Deno.test("member-list: a false include_removed is still sent, and CSV roles survive", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope("members", []) }]);
  await action.execute!({
    organization_id: 13,
    include_removed: false,
    membership_roles: "owner,manager",
    include: "users",
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    include_removed: "false",
    membership_roles: "owner,manager",
    include: "users",
  });
});
