import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-contacts.ts";

Deno.test("list-contacts: applies default limit=50, offset=0", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [], count: 0 } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/contacts");
  assertEquals(url.searchParams.get("limit"), "50");
  assertEquals(url.searchParams.get("offset"), "0");
});

Deno.test("list-contacts: forwards sort and modifiedSince when provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [] } }]);
  await action.execute!(
    { limit: 10, offset: 20, sort: "asc", modifiedSince: "2024-01-01T00:00:00Z" },
    ctx,
  );
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("limit"), "10");
  assertEquals(params.get("offset"), "20");
  assertEquals(params.get("sort"), "asc");
  assertEquals(params.get("modifiedSince"), "2024-01-01T00:00:00Z");
});

Deno.test("list-contacts: omits sort and modifiedSince when not provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [] } }]);
  await action.execute!({}, ctx);
  const params = new URL(calls[0].url).searchParams;
  assert(!params.has("sort"));
  assert(!params.has("modifiedSince"));
});
