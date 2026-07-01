import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-get.ts";

Deno.test("contact-get: by id → GETs /marketing/contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { id: "abc-123", email: "a@x.com" } },
  ]);
  const result = await action.execute!({ by: "id", contactId: "abc-123" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.sendgrid.com/v3/marketing/contacts/abc-123");
  assertEquals(result, { id: "abc-123", email: "a@x.com" });
});

Deno.test("contact-get: by email → POSTs SGQL to /marketing/contacts/search", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { result: [{ id: "abc-123", email: "a@x.com" }] } },
  ]);
  const result = await action.execute!({ by: "email", email: "a@x.com" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.sendgrid.com/v3/marketing/contacts/search");
  assertEquals(calls[0].headers["content-type"], "application/json");
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.query, "email LIKE 'a@x.com' ");
  assertEquals(result, { id: "abc-123", email: "a@x.com" });
});

Deno.test("contact-get: missing contactId when by=id rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ by: "id", contactId: "" }, ctx),
    Error,
    "`contactId`",
  );
});

Deno.test("contact-get: missing email when by=email rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ by: "email", email: "" }, ctx),
    Error,
    "`email`",
  );
});
