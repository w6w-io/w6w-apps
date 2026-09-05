import { assertEquals } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-get: fetches /contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", primary_email: "a@b.com" }) }]);
  const out = await contactGet.execute({ id: "1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/contacts/1");
  assertEquals(out, { id: "1", primary_email: "a@b.com" });
});
