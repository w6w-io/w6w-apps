import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-delete.ts";

const conn = { display: { baseUrl: "https://live-mt-server.wati.io/12345" } };

Deno.test("contact-delete: DELETEs /contacts/{target}, URL-encoding the target", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { contact_id: "1", deleted: true, cleanup_completed: true } }],
    conn,
  );
  const out = await action.execute({ target: "123456789:1415552671" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(
    calls[0].url,
    "https://live-mt-server.wati.io/12345/api/ext/v3/contacts/123456789%3A1415552671",
  );
  assertEquals(out, { contact_id: "1", deleted: true, cleanup_completed: true });
});

Deno.test("contact-delete: is idempotent (a repeat soft-delete is safe)", () => {
  assertEquals(action.idempotent, true);
});
