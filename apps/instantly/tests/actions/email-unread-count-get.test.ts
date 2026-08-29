import { assertEquals } from "@std/assert";
import emailUnreadCountGet from "../../actions/email-unread-count-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("email-unread-count-get: GETs /emails/unread/count with no params", async () => {
  const { ctx, calls } = mockCtx([{ body: { count: 7 } }]);
  const out = await emailUnreadCountGet.execute({}, ctx) as { count: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/emails/unread/count");
  assertEquals(out.count, 7);
});

Deno.test("email-unread-count-get: declares no params", () => {
  assertEquals(emailUnreadCountGet.params, []);
});
