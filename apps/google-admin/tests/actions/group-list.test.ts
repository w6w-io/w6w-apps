import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/group-list.ts";

Deno.test("group-list: GETs /groups with customer=my_customer by default", async () => {
  const body = { groups: [] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);

  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/directory/v1/groups");
  assertEquals(url.searchParams.get("customer"), "my_customer");
  assertEquals(url.searchParams.get("maxResults"), "200");
  assertEquals(result, body);
});

Deno.test("group-list: userKey drops the customer default (mutually exclusive per Google)", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ userKey: "person@example.com" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("userKey"), "person@example.com");
  assertEquals(url.searchParams.get("customer"), null);
});

Deno.test("group-list: domain drops the customer default", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ domain: "example.com" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("domain"), "example.com");
  assertEquals(url.searchParams.get("customer"), null);
});
