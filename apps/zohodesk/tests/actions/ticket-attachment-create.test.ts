import { assert, assertEquals } from "@std/assert";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-attachment-create.ts";

Deno.test("ticket-attachment-create: POSTs multipart form data to /tickets/{id}/attachments", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { id: "1", name: "issues.txt" } }]);
  const base64 = btoa("hello world");
  const out = await action.execute(
    { ticketId: "42", file: base64, fileName: "issues.txt", isPublic: true },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/tickets/42/attachments");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.searchParams.get("isPublic"), "true");
  assertEquals(calls[0].headers.orgid, "2389290");
  assert(calls[0].body === "[FormData]", "expected a multipart FormData body");
  assertEquals(out, { id: "1", name: "issues.txt" });
});

Deno.test("ticket-attachment-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
