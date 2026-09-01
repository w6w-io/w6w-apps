import { assertEquals } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-get: fetches by jnid and returns the record unwrapped", async () => {
  const { ctx, calls } = mockCtx([{ body: { jnid: "a1", first_name: "Bruce" } }]);
  const out = await contactGet.execute({ jnid: "a1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api1/contacts/a1");
  assertEquals(out, { jnid: "a1", first_name: "Bruce" });
});

Deno.test("contact-get: passes actor through as a query param when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { jnid: "a1" } }]);
  await contactGet.execute({ jnid: "a1", actor: "sam@company.com" }, ctx);
  assertEquals(queryOf(calls[0].url), { actor: "sam@company.com" });
});

Deno.test("contact-get: omits actor when not supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { jnid: "a1" } }]);
  await contactGet.execute({ jnid: "a1" }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("contact-get: jnid is path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await contactGet.execute({ jnid: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api1/contacts/a%2Fb");
});
