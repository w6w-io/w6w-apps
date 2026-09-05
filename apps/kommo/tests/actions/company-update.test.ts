import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/company-update.ts";

const conn = { display: { accountDomain: "acme.kommo.com" } };

Deno.test("company-update: PATCHes /companies/{id}, not the bulk /companies route", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 200,
      body: {
        _embedded: { companies: [{ id: 1247556, name: "Atlas Co.", updated_at: 1687335927 }] },
      },
    }],
    conn,
  );
  const out = await action.execute!({ id: 1247556, name: "Atlas Co." }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url, "https://acme.kommo.com/api/v4/companies/1247556");
  assertEquals(JSON.parse(calls[0].body!), { name: "Atlas Co." });
  assertEquals(out, { id: 1247556, updatedAt: 1687335927 });
});

Deno.test("company-update: idempotent is true", () => {
  assertEquals(action.idempotent, true);
});
