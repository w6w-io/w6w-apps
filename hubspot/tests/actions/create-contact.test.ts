import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-contact.ts";

Deno.test("create-contact: POSTs to /crm/v3/objects/contacts with a properties body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", properties: { email: "a@x" } } }]);
  const result = await action.execute!(
    { email: "a@x", firstname: "Ada", additionalProperties: { custom: "yes" } },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/crm/v3/objects/contacts");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.properties.email, "a@x");
  assertEquals(body.properties.firstname, "Ada");
  assertEquals(body.properties.custom, "yes");
  assertEquals((result as { id: string }).id, "1");
});
