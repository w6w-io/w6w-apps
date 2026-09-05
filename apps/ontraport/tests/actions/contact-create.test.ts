import { assertEquals } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-create: calls POST /1/Contacts, form-urlencoded", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "7", firstname: "Mary" }) }]);
  await contactCreate.execute({
    firstname: "Mary",
    lastname: "Smith",
    email: "msmith@ontraport.com",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/1/Contacts");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("firstname"), "Mary");
  assertEquals(form.get("lastname"), "Smith");
  assertEquals(form.get("email"), "msmith@ontraport.com");
});

Deno.test("contact-create: extraFields are merged into the form body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "7" }) }]);
  await contactCreate.execute({ email: "a@b.com", extraFields: { f1500: "*/*1*/*" } }, ctx);

  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("f1500"), "*/*1*/*");
});

Deno.test("contact-create: an extraFields value given as a JSON string is parsed, not sent literally", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "7" }) }]);
  await contactCreate.execute({ email: "a@b.com", extraFields: '{"birthday": 804798000}' }, ctx);

  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("birthday"), "804798000");
});
