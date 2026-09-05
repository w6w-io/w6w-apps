import { assertEquals } from "@std/assert";
import contactMerge from "../../actions/contact-merge.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-merge: calls POST /1/Contacts/saveorupdate, form-urlencoded", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ attrs: { id: "7" } }) }]);
  await contactMerge.execute({ email: "msmith@ontraport.com", firstname: "Marie" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/1/Contacts/saveorupdate");
  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("email"), "msmith@ontraport.com");
  assertEquals(form.get("firstname"), "Marie");
});

Deno.test("contact-merge: ignoreBlanks is sent as '1', matching the vendor's binary flag", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await contactMerge.execute({ email: "a@b.com", ignoreBlanks: true }, ctx);
  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("ignore_blanks"), "1");
});

Deno.test("contact-merge: ignoreBlanks is omitted, not sent as '0', when left off", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await contactMerge.execute({ email: "a@b.com" }, ctx);
  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.has("ignore_blanks"), false);
});
