import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

const conn = { display: { accountDomain: "acme.kommo.com" } };

Deno.test("contact-create: POSTs an array body to /contacts", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { _embedded: { contacts: [{ id: 963408, request_id: "0" }] } } }],
    conn,
  );
  const out = await action.execute!({ firstName: "Jim", lastName: "Halpert" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.kommo.com/api/v4/contacts");
  assertEquals(JSON.parse(calls[0].body!), [{ first_name: "Jim", last_name: "Halpert" }]);
  assertEquals(out, { id: 963408, requestId: "0" });
});

Deno.test("contact-create: does not expose top-level phone/email params — they are custom fields", () => {
  const keys = action.params!.map((p) => p.key);
  assertEquals(keys.includes("phone"), false);
  assertEquals(keys.includes("email"), false);
});

Deno.test("contact-create: idempotent is false — Kommo does not dedupe on create", () => {
  assertEquals(action.idempotent, false);
});
