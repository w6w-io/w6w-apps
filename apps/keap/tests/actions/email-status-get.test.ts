import { assertEquals } from "@std/assert";
import emailStatusGet from "../../actions/email-status-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("email-status-get: reads the per-address status path", async () => {
  const { ctx, calls } = mockCtx([{
    body: { email: "a@b.com", opted_in: true, status: "SINGLE_OPT_IN" },
  }]);
  const out = await emailStatusGet.execute({ email: "a@b.com" }, ctx) as { status: string };
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/emailAddresses/a%40b.com/status");
  assertEquals(out.status, "SINGLE_OPT_IN");
});

/**
 * The address goes in the PATH. An unescaped `+` — the common Gmail tag form —
 * decodes to a space and 404s.
 */
Deno.test("email-status-get: a plus-addressed email survives path encoding", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await emailStatusGet.execute({ email: "jo+keap@example.com" }, ctx);
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/emailAddresses/jo%2Bkeap%40example.com/status");
});

Deno.test("email-status-get: the full status is returned, not just the boolean", async () => {
  const { ctx } = mockCtx([{ body: { email: "a@b.com", opted_in: false, status: "HARD_BOUNCE" } }]);
  const out = await emailStatusGet.execute({ email: "a@b.com" }, ctx) as {
    opted_in: boolean;
    status: string;
  };
  // `opted_in` collapses 17 states into one bit; HARD_BOUNCE and a plain
  // unsubscribe need different handling.
  assertEquals(out.opted_in, false);
  assertEquals(out.status, "HARD_BOUNCE");
});
