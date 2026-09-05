import { assertEquals } from "@std/assert";
import { mockInsightlyCtx } from "../_helpers.ts";
import action from "../../actions/contact-get-many.ts";

Deno.test("contact-get-many: plain list with no filter", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ body: [{ CONTACT_ID: 1 }] }]);
  const out = await action.execute({ top: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3.1/Contacts");
  assertEquals(url.searchParams.get("top"), "10");
  assertEquals(out, { contacts: [{ CONTACT_ID: 1 }] });
});

Deno.test("contact-get-many: switches to /Search when a filter field is set", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ body: [] }]);
  await action.execute({ fieldName: "EMAIL_ADDRESS", fieldValue: "jo@acme.test" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3.1/Contacts/Search");
  assertEquals(url.searchParams.get("field_name"), "EMAIL_ADDRESS");
  assertEquals(url.searchParams.get("field_value"), "jo@acme.test");
});
