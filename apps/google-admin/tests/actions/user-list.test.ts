import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

Deno.test("user-list: GETs /users with customer=my_customer by default", async () => {
  const body = { users: [{ id: "u-1" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);

  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/directory/v1/users");
  assertEquals(url.searchParams.get("customer"), "my_customer");
  assertEquals(url.searchParams.get("domain"), null);
  assertEquals(url.searchParams.get("maxResults"), "100");
  assertEquals(result, body);
});

Deno.test("user-list: domain overrides the customer default", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ domain: "example.com" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("domain"), "example.com");
  assertEquals(url.searchParams.get("customer"), null);
});

Deno.test("user-list: forwards query, paging and showDeleted", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    query: "orgUnitPath=/Sales",
    maxResults: 25,
    pageToken: "tok",
    orderBy: "email",
    sortOrder: "DESCENDING",
    showDeleted: true,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("query"), "orgUnitPath=/Sales");
  assertEquals(url.searchParams.get("maxResults"), "25");
  assertEquals(url.searchParams.get("pageToken"), "tok");
  assertEquals(url.searchParams.get("orderBy"), "email");
  assertEquals(url.searchParams.get("sortOrder"), "DESCENDING");
  assertEquals(url.searchParams.get("showDeleted"), "true");
});
