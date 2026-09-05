import { assertEquals } from "@std/assert";
import { mockInsightlyCtx } from "../_helpers.ts";
import action from "../../actions/contact-get.ts";

Deno.test("contact-get: GETs /Contacts/{id}", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ body: { CONTACT_ID: 1, FIRST_NAME: "Jo" } }]);
  const out = await action.execute({ contactId: 1 }, ctx);
  assertEquals(calls[0].url, "https://api.na1.insightly.com/v3.1/Contacts/1");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { CONTACT_ID: 1, FIRST_NAME: "Jo" });
});
