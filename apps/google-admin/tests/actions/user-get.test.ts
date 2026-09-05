import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

Deno.test("user-get: GETs /users/{userKey} with basic projection by default", async () => {
  const body = { id: "u-1", primaryEmail: "a@example.com" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ userKey: "a@example.com" }, ctx);

  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/directory/v1/users/a%40example.com");
  assertEquals(url.searchParams.get("projection"), "basic");
  assertEquals(url.searchParams.get("viewType"), "admin_view");
  assertEquals(result, body);
});

Deno.test("user-get: forwards a custom projection/viewType", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ userKey: "u-1", projection: "full", viewType: "domain_public" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("projection"), "full");
  assertEquals(url.searchParams.get("viewType"), "domain_public");
});
