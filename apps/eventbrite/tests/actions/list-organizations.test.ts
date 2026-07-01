import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-organizations.ts";

Deno.test("list-organizations: GETs /users/me/organizations/ with page", async () => {
  const body = { organizations: [{ id: "org1" }], pagination: { object_count: 1 } };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ page: 2 }, ctx);

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/users/me/organizations/");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});

Deno.test("list-organizations: omits page when undefined", async () => {
  const { ctx, calls } = mockCtx([{ body: { organizations: [], pagination: {} } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assert(!url.searchParams.has("page"), "page must not be sent when undefined");
});
