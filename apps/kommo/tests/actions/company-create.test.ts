import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/company-create.ts";

const conn = { display: { accountDomain: "acme.kommo.com" } };

Deno.test("company-create: POSTs an array body to /companies", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { _embedded: { companies: [{ id: 1247556, request_id: "0" }] } } }],
    conn,
  );
  const out = await action.execute!({ name: "Atlas Co." }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.kommo.com/api/v4/companies");
  assertEquals(JSON.parse(calls[0].body!), [{ name: "Atlas Co." }]);
  assertEquals(out, { id: 1247556, requestId: "0" });
});

/** Unlike Mautic's Company, Kommo's field is bare `name`, not `companyname`. */
Deno.test("company-create: the name field is bare, not prefixed company*", () => {
  const keys = action.params!.map((p) => p.key);
  assertEquals(keys.includes("name"), true);
  assertEquals(keys.includes("companyName"), false);
});

Deno.test("company-create: idempotent is false — Kommo does not dedupe on create", () => {
  assertEquals(action.idempotent, false);
});
