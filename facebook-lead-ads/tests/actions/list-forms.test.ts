import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-forms.ts";

Deno.test("list-forms: GETs /{pageId}/leadgen_forms with fields", async () => {
  const body = { data: [{ id: "form1", name: "Signup" }], paging: {} };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ pageId: "page-123" }, ctx);

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "graph.facebook.com");
  assertEquals(url.pathname, "/v19.0/page-123/leadgen_forms");
  assertEquals(url.searchParams.get("fields"), "id,name,status,locale");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});

Deno.test("list-forms: pageAccessToken overrides the connection token", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], paging: {} } }]);
  await action.execute!({ pageId: "page-1", pageAccessToken: "page-tok-xyz" }, ctx);
  assertEquals(calls[0].headers["authorization"], "Bearer page-tok-xyz");
});

Deno.test("list-forms: omits authorization when no override is provided (runtime injects it)", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], paging: {} } }]);
  await action.execute!({ pageId: "page-1" }, ctx);
  assert(!("authorization" in calls[0].headers), "auth must be injected by the sign hook, not us");
});

Deno.test("list-forms: forwards cursor as the `after` query param", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], paging: {} } }]);
  await action.execute!({ pageId: "page-1", cursor: "cursor-abc" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("after"), "cursor-abc");
});
