import { assertEquals } from "@std/assert";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-thread-get.ts";

Deno.test("ticket-thread-get: GETs /tickets/{id}/threads/{threadId}", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { id: "5" } }]);
  const out = await action.execute(
    { ticketId: "42", threadId: "5", include: "plainText" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/tickets/42/threads/5");
  assertEquals(url.searchParams.get("include"), "plainText");
  assertEquals(out, { id: "5" });
});
