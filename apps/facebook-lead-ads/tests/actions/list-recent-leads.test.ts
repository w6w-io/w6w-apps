import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-recent-leads.ts";

Deno.test("list-recent-leads: GETs /{formId}/leads with defaults (limit=25, full field set)", async () => {
  const body = {
    data: [{ id: "lead-1", created_time: "2026-06-01T00:00:00+0000", field_data: [] }],
    paging: {},
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ formId: "form-42" }, ctx);

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "graph.facebook.com");
  assertEquals(url.pathname, "/v19.0/form-42/leads");
  assertEquals(url.searchParams.get("limit"), "25");
  assertEquals(
    url.searchParams.get("fields"),
    "id,created_time,ad_id,ad_name,adset_id,adset_name,form_id,field_data",
  );
  assertEquals(result, body);
});

Deno.test("list-recent-leads: forwards `since` and `limit` when provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], paging: {} } }]);
  await action.execute!({ formId: "f", since: 1_700_000_000, limit: 50 }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("since"), "1700000000");
  assertEquals(params.get("limit"), "50");
});

Deno.test("list-recent-leads: omits since/cursor when not supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], paging: {} } }]);
  await action.execute!({ formId: "f" }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assert(!params.has("since"));
  assert(!params.has("after"));
});

Deno.test("list-recent-leads: pageAccessToken overrides the connection token", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], paging: {} } }]);
  await action.execute!({ formId: "f", pageAccessToken: "page-tok" }, ctx);
  assertEquals(calls[0].headers["authorization"], "Bearer page-tok");
});
