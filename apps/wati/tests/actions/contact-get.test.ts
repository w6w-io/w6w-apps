import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-get.ts";

const conn = { display: { baseUrl: "https://live-mt-server.wati.io/12345" } };

Deno.test("contact-get: GETs /contacts/{target}, URL-encoding the target", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1", name: "John Doe" } }], conn);
  const out = await action.execute({ target: "123456789:1415552671" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://live-mt-server.wati.io/12345/api/ext/v3/contacts/123456789%3A1415552671",
  );
  assertEquals(out, { id: "1", name: "John Doe" });
});
