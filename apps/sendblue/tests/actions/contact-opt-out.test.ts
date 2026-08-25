import { assertEquals } from "@std/assert";
import contactOptOut from "../../actions/contact-opt-out.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-opt-out: defaults optedOut to true when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK", opted_out: true } }]);
  await contactOptOut.execute({ number: "+1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/contacts/opt-out");
  assertEquals(jsonBodyOf(calls[0]), { number: "+1", opted_out: true });
});

Deno.test("contact-opt-out: opts back in with optedOut = false", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK", opted_out: false } }]);
  await contactOptOut.execute({ number: "+1", optedOut: false }, ctx);

  assertEquals(jsonBodyOf(calls[0]), { number: "+1", opted_out: false });
});
