import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-orders.ts";

const DEFAULT_EXPAND =
  "attendees,ticket_buyer_settings,contact_list_preferences,answers,survey_responses,survey,refund_requests";

Deno.test("list-orders: scope=event routes to /events/{id}/orders/", async () => {
  const body = { orders: [], pagination: {} };
  const { ctx, calls } = mockCtx([{ body }]);
  await action.execute!({ scope: "event", scopeId: "evt-1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/events/evt-1/orders/");
  assertEquals(url.searchParams.get("page_size"), "50");
  assertEquals(url.searchParams.get("expand"), DEFAULT_EXPAND);
});

Deno.test("list-orders: scope=organization routes to /organizations/{id}/orders/", async () => {
  const { ctx, calls } = mockCtx([{ body: { orders: [], pagination: {} } }]);
  await action.execute!(
    {
      scope: "organization",
      scopeId: "acct-1",
      status: "placed",
      changedSince: "2026-01-01T00:00:00Z",
      onlyEmails: "a@x.com,b@x.com",
      excludeEmails: "c@x.com",
      pageSize: 10,
      continuation: "c1",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/organizations/acct-1/orders/");
  const p = url.searchParams;
  assertEquals(p.get("status"), "placed");
  assertEquals(p.get("changed_since"), "2026-01-01T00:00:00Z");
  assertEquals(p.get("only_emails"), "a@x.com,b@x.com");
  assertEquals(p.get("exclude_emails"), "c@x.com");
  assertEquals(p.get("page_size"), "10");
  assertEquals(p.get("continuation"), "c1");
});
