import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/upsert-contact.ts";

Deno.test("upsert-contact: POSTs /v3/contacts with updateEnabled: true", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ email: "ada@x.com" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/contacts");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.email, "ada@x.com");
  assertEquals(body.updateEnabled, true);
  assertEquals(result, { success: true });
});

Deno.test("upsert-contact: forwards attributes and listIds", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!(
    { email: "ada@x.com", attributes: { FIRSTNAME: "Ada" }, listIds: [5] },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.attributes, { FIRSTNAME: "Ada" });
  assertEquals(body.listIds, [5]);
});
