import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-contact.ts";

Deno.test("create-contact: POSTs /v3/contacts with the email", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await action.execute!({ email: "ada@x.com" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/contacts");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { email: "ada@x.com" });
});

Deno.test("create-contact: forwards attributes, listIds, updateEnabled when provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await action.execute!(
    {
      email: "ada@x.com",
      attributes: { FIRSTNAME: "Ada" },
      listIds: [1, 2],
      updateEnabled: true,
      emailBlacklisted: false,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.attributes, { FIRSTNAME: "Ada" });
  assertEquals(body.listIds, [1, 2]);
  assertEquals(body.updateEnabled, true);
  assertEquals(body.emailBlacklisted, false);
});

Deno.test("create-contact: omits optional fields when undefined", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await action.execute!({ email: "ada@x.com" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("attributes" in body, false);
  assertEquals("listIds" in body, false);
  assertEquals("updateEnabled" in body, false);
});
