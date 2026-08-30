import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-get.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

Deno.test("contact-get: GETs /contacts/{id} and unwraps the `contact` envelope", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { contact: { id: 47, points: 10 } } }],
    conn,
  );
  const out = await action.execute!({ contactId: 47 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://mautic.example.com/api/contacts/47");
  assertEquals(out, { id: 47, points: 10 });
});

Deno.test("contact-get: rejects a non-numeric contactId before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  const err = await assertRejects(
    async () => await action.execute!({ contactId: "abc" }, ctx),
    Error,
  );
  assert(err.message.includes("contactId"), err.message);
  assertEquals(calls.length, 0);
});
