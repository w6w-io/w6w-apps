import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-ticket-classes.ts";

Deno.test("list-ticket-classes: default path is /events/{id}/ticket_classes/", async () => {
  const body = { ticket_classes: [], pagination: {} };
  const { ctx, calls } = mockCtx([{ body }]);
  await action.execute!({ eventId: "evt-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/events/evt-1/ticket_classes/");
  assertEquals(url.searchParams.get("page_size"), "100");
});

Deno.test("list-ticket-classes: forSale=true switches path to /ticket_classes/for_sale/", async () => {
  const { ctx, calls } = mockCtx([{ body: { ticket_classes: [], pagination: {} } }]);
  await action.execute!({ eventId: "evt-1", forSale: true, continuation: "c1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/events/evt-1/ticket_classes/for_sale/");
  assertEquals(url.searchParams.get("continuation"), "c1");
});
