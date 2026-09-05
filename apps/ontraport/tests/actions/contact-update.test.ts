import { assertEquals, assertThrows } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-update: calls PUT /1/Contacts, form-urlencoded, with the given id", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "29" }) }]);
  await contactUpdate.execute({ id: "29", firstname: "Bob" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/1/Contacts");
  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("id"), "29");
  assertEquals(form.get("firstname"), "Bob");
});

Deno.test("contact-update: id takes precedence over uniqueId when both are sent", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await contactUpdate.execute({ id: "29", uniqueId: "D4GD000", firstname: "Bob" }, ctx);

  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("id"), "29");
  assertEquals(form.has("unique_id"), false);
});

Deno.test("contact-update: falls back to uniqueId when id is absent", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await contactUpdate.execute({ uniqueId: "D4GD000" }, ctx);

  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("unique_id"), "D4GD000");
  assertEquals(form.has("id"), false);
});

Deno.test("contact-update: throws synchronously, before any request, when neither id nor uniqueId is given", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(() => contactUpdate.execute({}, ctx));
  assertEquals(calls.length, 0);
});
