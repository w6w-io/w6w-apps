import { assertEquals } from "@std/assert";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-get.ts";

Deno.test("ticket-get: GETs /tickets/{id} and returns the bare object", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { id: "42", subject: "Hi" } }]);
  const out = await action.execute({ recordId: "42", include: "contacts" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/tickets/42");
  assertEquals(url.searchParams.get("include"), "contacts");
  assertEquals(calls[0].headers.orgid, "2389290");
  assertEquals(out, { id: "42", subject: "Hi" });
});
