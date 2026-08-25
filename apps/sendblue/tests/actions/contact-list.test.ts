import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: GETs /api/v2/contacts and returns the bare array untouched", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ phone: "+1" }] }]);
  const out = await contactList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/contacts");
  assertEquals(queryOf(calls[0].url), { limit: "100", offset: "0" });
  assertEquals(out, [{ phone: "+1" }]);
});
