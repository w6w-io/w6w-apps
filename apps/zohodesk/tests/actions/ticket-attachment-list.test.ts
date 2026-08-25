import { assertEquals } from "@std/assert";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-attachment-list.ts";

Deno.test("ticket-attachment-list: GETs /tickets/{id}/attachments", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { data: [{ id: "1" }] } }]);
  const out = await action.execute({ ticketId: "42", include: "creator" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/tickets/42/attachments");
  assertEquals(url.searchParams.get("include"), "creator");
  assertEquals(out.data, [{ id: "1" }]);
});
