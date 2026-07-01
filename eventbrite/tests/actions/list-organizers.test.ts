import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-organizers.ts";

Deno.test("list-organizers: GETs /organizations/{id}/organizers/", async () => {
  const body = { organizers: [{ id: "orgr1" }], pagination: { object_count: 1 } };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ organizationId: "acct-123", page: 3 }, ctx);

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/organizations/acct-123/organizers/");
  assertEquals(url.searchParams.get("page"), "3");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});
