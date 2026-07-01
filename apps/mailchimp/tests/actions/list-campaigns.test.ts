import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-campaigns.ts";

Deno.test("list-campaigns: GETs /campaigns with default fields, count, offset", async () => {
  const { ctx, calls } = mockCtx([{ body: { campaigns: [], total_items: 0 } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/3.0/campaigns");
  assertEquals(url.searchParams.get("count"), "10");
  assertEquals(url.searchParams.get("offset"), "0");
  const fields = url.searchParams.get("fields") ?? "";
  // Default field-set from n8n's Mailchimp node.
  assert(fields.includes("campaigns.id"));
  assert(fields.includes("campaigns.settings.title"));
});

Deno.test("list-campaigns: forwards status/list/filters and joins array fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { campaigns: [] } }]);
  await action.execute!(
    {
      status: "sent",
      listId: "abc",
      beforeCreateTime: "2026-02-01T00:00:00Z",
      sinceCreateTime: "2026-01-01T00:00:00Z",
      beforeSendTime: "2026-02-02T00:00:00Z",
      sinceSendTime: "2026-01-02T00:00:00Z",
      sortField: "send_time",
      sortDirection: "DESC",
      fields: ["campaigns.id", "campaigns.status"],
      excludeFields: ["campaigns._links"],
      count: 25,
      offset: 50,
    },
    ctx,
  );
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("status"), "sent");
  assertEquals(p.get("list_id"), "abc");
  assertEquals(p.get("before_create_time"), "2026-02-01T00:00:00Z");
  assertEquals(p.get("since_create_time"), "2026-01-01T00:00:00Z");
  assertEquals(p.get("before_send_time"), "2026-02-02T00:00:00Z");
  assertEquals(p.get("since_send_time"), "2026-01-02T00:00:00Z");
  assertEquals(p.get("sort_field"), "send_time");
  assertEquals(p.get("sort_dir"), "DESC");
  assertEquals(p.get("fields"), "campaigns.id,campaigns.status");
  assertEquals(p.get("exclude_fields"), "campaigns._links");
  assertEquals(p.get("count"), "25");
  assertEquals(p.get("offset"), "50");
});
