import { assertEquals } from "@std/assert";
import emailGet from "../../actions/email-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("email-get: GETs /emails/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e1", subject: "Hi" } }]);
  const out = await emailGet.execute({ id: "e1" }, ctx) as { subject: string };

  assertEquals(pathOf(calls[0].url), "/api/v2/emails/e1");
  assertEquals(out.subject, "Hi");
});
