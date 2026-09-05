import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/company-sync.ts";

const conn = { display: { restBaseUrl: "https://123-abc-456.mktorest.com" } };

Deno.test("company-sync: POSTs to /rest/v1/companies.json with default action", async () => {
  const { ctx, calls } = mockCtx([
    { body: { success: true, result: [{ id: 1, status: "created" }] } },
  ], conn);
  const out = await action.execute!(
    { externalCompanyId: "19UYA31581L000000", company: "Google" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://123-abc-456.mktorest.com/rest/v1/companies.json");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.action, "createOrUpdate");
  assertEquals(body.input, [{ externalCompanyId: "19UYA31581L000000", company: "Google" }]);
  assertEquals(out, { id: 1, status: "created" });
});

Deno.test("company-sync: otherFields merges arbitrary fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, result: [{}] } }], conn);
  await action.execute!({ company: "Acme", otherFields: '{"annualRevenue": 5000000}' }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.input[0].annualRevenue, 5000000);
});

Deno.test("company-sync: requires at least one company field", async () => {
  const { ctx } = mockCtx([], conn);
  let threw = false;
  try {
    await action.execute!({}, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("company-sync: idempotent is false", () => {
  assertEquals(action.idempotent, false);
});
