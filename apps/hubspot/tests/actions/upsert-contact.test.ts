import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/upsert-contact.ts";

Deno.test("upsert-contact: PUTs /crm/v3/objects/contacts/{email}?idProperty=email", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await action.execute!({ email: "a@x", firstname: "Ada" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "PUT");
  assertEquals(url.pathname, "/crm/v3/objects/contacts/a%40x");
  assertEquals(url.searchParams.get("idProperty"), "email");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.properties.email, "a@x");
  assertEquals(body.properties.firstname, "Ada");
});
