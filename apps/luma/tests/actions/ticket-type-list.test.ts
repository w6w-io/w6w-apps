import { assertEquals } from "@std/assert";
import ticketTypeList from "../../actions/ticket-type-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("ticket-type-list: include_hidden is sent as the literal string 'true'", async () => {
  const { ctx, calls } = mockCtx([{ body: { entries: [] } }]);
  await ticketTypeList.execute({ eventId: "evt-1", includeHidden: true }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/events/ticket-types/list");
  assertEquals(queryOf(calls[0].url), { event_id: "evt-1", include_hidden: "true" });
});

Deno.test("ticket-type-list: include_hidden is omitted, not sent 'false', when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: { entries: [] } }]);
  await ticketTypeList.execute({ eventId: "evt-1" }, ctx);
  assertEquals(queryOf(calls[0].url), { event_id: "evt-1" });
});
