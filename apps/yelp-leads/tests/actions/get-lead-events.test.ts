import { assertEquals } from "@std/assert";
import getLeadEvents from "../../actions/get-lead-events.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-lead-events: no optional params sends no query", async () => {
  const { ctx, calls } = mockCtx([{ body: { events: [] } }]);
  await getLeadEvents.execute({ leadId: "abc" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/leads/abc/events");
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("get-lead-events: forwards limit and cursor params", async () => {
  const { ctx, calls } = mockCtx([{ body: { events: [] } }]);
  await getLeadEvents.execute(
    { leadId: "abc", limit: 2, olderThanCursor: "cursor5", newerThanCursor: "cursor1" },
    ctx,
  );

  assertEquals(queryOf(calls[0].url), {
    limit: "2",
    older_than_cursor: "cursor5",
    newer_than_cursor: "cursor1",
  });
});

Deno.test("get-lead-events: returns the events array untouched", async () => {
  const events = [
    {
      id: "e1",
      cursor: "c1",
      event_type: "TEXT",
      event_content: { text: "hi", fallback_text: "hi" },
    },
  ];
  const { ctx } = mockCtx([{ body: { events } }]);
  const result = await getLeadEvents.execute({ leadId: "abc" }, ctx) as { events: unknown };
  assertEquals(result.events, events);
});
