import { assertEquals } from "@std/assert";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-comment-list.ts";

Deno.test("ticket-comment-list: GETs /tickets/{id}/comments", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { data: [{ id: "1" }] } }]);
  const out = await action.execute({ ticketId: "42", include: "mentions" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/tickets/42/comments");
  assertEquals(url.searchParams.get("include"), "mentions");
  assertEquals(out.data, [{ id: "1" }]);
});
