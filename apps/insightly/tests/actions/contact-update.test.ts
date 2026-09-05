import { assertEquals } from "@std/assert";
import { mockInsightlyCtx } from "../_helpers.ts";
import action from "../../actions/contact-update.ts";

Deno.test("contact-update: PUTs /Contacts with the id and only the set fields", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ status: 201, body: { CONTACT_ID: 1 } }]);
  await action.execute({ contactId: 1, title: "CTO" }, ctx);
  assertEquals(calls[0].url, "https://api.na1.insightly.com/v3.1/Contacts");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { CONTACT_ID: 1, TITLE: "CTO" });
});
