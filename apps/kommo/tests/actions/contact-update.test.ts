import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-update.ts";

const conn = { display: { accountDomain: "acme.kommo.com" } };

Deno.test("contact-update: PATCHes a plain object body to /contacts/{id}", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 200,
      body: { _embedded: { contacts: [{ id: 963410, name: "John Doe", updated_at: 1687192924 }] } },
    }],
    conn,
  );
  const out = await action.execute!({ id: 963410, name: "John Doe" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url, "https://acme.kommo.com/api/v4/contacts/963410");
  assertEquals(JSON.parse(calls[0].body!), { name: "John Doe" });
  assertEquals(out, { id: 963410, updatedAt: 1687192924 });
});

Deno.test("contact-update: idempotent is true", () => {
  assertEquals(action.idempotent, true);
});
