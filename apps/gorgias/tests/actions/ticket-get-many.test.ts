import { assertEquals } from "@std/assert";
import { mockGorgiasCtx } from "../_helpers.ts";
import action from "../../actions/ticket-get-many.ts";

Deno.test("ticket-get-many: GETs /tickets with the query filters mapped to Gorgias's names", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: { data: [] } }]);
  await action.execute(
    {
      customerId: 4,
      viewId: 21,
      externalId: "ticket-ge432d",
      trashed: false,
      orderBy: "updated_datetime:asc",
      cursor: "abc",
      limit: 50,
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/tickets");
  assertEquals(url.searchParams.get("customer_id"), "4");
  assertEquals(url.searchParams.get("view_id"), "21");
  assertEquals(url.searchParams.get("external_id"), "ticket-ge432d");
  assertEquals(url.searchParams.get("trashed"), "false");
  assertEquals(url.searchParams.get("order_by"), "updated_datetime:asc");
  assertEquals(url.searchParams.get("cursor"), "abc");
  assertEquals(url.searchParams.get("limit"), "50");
});

Deno.test("ticket-get-many: omits unset filters entirely", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: { data: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("customer_id"), false);
  assertEquals(url.searchParams.has("external_id"), false);
});
