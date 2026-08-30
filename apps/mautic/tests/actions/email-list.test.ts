import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/email-list.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

Deno.test("email-list: GETs /emails and unwraps the `emails` map", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { total: 1, emails: { "1": { id: 1, name: "Welcome" } } } },
  ], conn);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].url.startsWith("https://mautic.example.com/api/emails"), true);
  assertEquals(out, [{ id: 1, name: "Welcome" }]);
});
