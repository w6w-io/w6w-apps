import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-create.ts";

const conn = { display: { accountDomain: "acme.kommo.com" } };

Deno.test("lead-create: POSTs an array body to /leads", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { _embedded: { leads: [{ id: 152462, request_id: "0" }] } } }],
    conn,
  );
  const out = await action.execute!({ name: "Example Lead", price: 1000 }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.kommo.com/api/v4/leads");
  assertEquals(JSON.parse(calls[0].body!), [{ name: "Example Lead", price: 1000 }]);
  assertEquals(out, { id: 152462, requestId: "0" });
});

Deno.test("lead-create: tagsToAdd becomes Kommo's [{name}] shape", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { _embedded: { leads: [{ id: 1, request_id: "0" }] } } }],
    conn,
  );
  await action.execute!({ tagsToAdd: "vip, hot" }, ctx);
  const body = JSON.parse(calls[0].body!)[0];
  assertEquals(body.tags_to_add, [{ name: "vip" }, { name: "hot" }]);
});

Deno.test("lead-create: customFieldsValues parses a JSON-string array", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { _embedded: { leads: [{ id: 1, request_id: "0" }] } } }],
    conn,
  );
  await action.execute!(
    { customFieldsValues: '[{"field_id":184994,"values":[{"value":true}]}]' },
    ctx,
  );
  const body = JSON.parse(calls[0].body!)[0];
  assertEquals(body.custom_fields_values, [{ field_id: 184994, values: [{ value: true }] }]);
});

Deno.test("lead-create: idempotent is false — Kommo mints a new lead ID per call", () => {
  assertEquals(action.idempotent, false);
});
