import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-sync.ts";

const conn = { display: { restBaseUrl: "https://123-abc-456.mktorest.com" } };

Deno.test("lead-sync: POSTs to /rest/v1/leads.json with default action/lookupField", async () => {
  const { ctx, calls } = mockCtx([
    { body: { success: true, result: [{ id: 1, status: "created" }] } },
  ], conn);
  const out = await action.execute!({ email: "jim@example.com", firstName: "Jim" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://123-abc-456.mktorest.com/rest/v1/leads.json");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.action, "createOrUpdate");
  assertEquals(body.lookupField, "email");
  assertEquals(body.input, [{ email: "jim@example.com", firstName: "Jim" }]);
  assertEquals(out, { id: 1, status: "created" });
});

Deno.test("lead-sync: honors an explicit action and lookupField", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, result: [{ id: 1, status: "updated" }] },
  }], conn);
  await action.execute!({ action: "updateOnly", lookupField: "id", id: 1, firstName: "Jim" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.action, "updateOnly");
  assertEquals(body.lookupField, "id");
  assertEquals(body.input, [{ id: 1, firstName: "Jim" }]);
});

Deno.test("lead-sync: otherFields merges arbitrary field aliases", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, result: [{}] } }], conn);
  await action.execute!({ email: "a@b.com", otherFields: '{"company": "Acme"}' }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.input[0].company, "Acme");
});

Deno.test("lead-sync: rejects invalid otherFields JSON", async () => {
  const { ctx } = mockCtx([], conn);
  let threw = false;
  try {
    await action.execute!({ email: "a@b.com", otherFields: "{not json" }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("lead-sync: requires at least one lead field", async () => {
  const { ctx } = mockCtx([], conn);
  let threw = false;
  try {
    await action.execute!({}, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("lead-sync: idempotent is false — Marketo's own docs warn of duplicates on concurrent retries", () => {
  assertEquals(action.idempotent, false);
});
