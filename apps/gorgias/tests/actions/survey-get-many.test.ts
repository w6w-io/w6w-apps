import { assertEquals } from "@std/assert";
import { mockGorgiasCtx } from "../_helpers.ts";
import action from "../../actions/survey-get-many.ts";

Deno.test("survey-get-many: GETs /satisfaction-surveys, wrapping the bare array in `surveys`", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: [{ id: 1234 }] }]);
  const out = await action.execute({ ticketId: 12 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/satisfaction-surveys");
  assertEquals(url.searchParams.get("ticket_id"), "12");
  // The vendor's own schema returns a bare array here, unlike every other
  // list endpoint's `{ object, uri, data, meta }` envelope.
  assertEquals(out, { surveys: [{ id: 1234 }] });
});
