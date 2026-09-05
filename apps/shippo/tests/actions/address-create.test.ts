import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/address-create.ts";

Deno.test("address-create: posts to /addresses with a bare (unwrapped) body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { object_id: "adr_1", is_complete: true },
  }]);
  await action.execute!({ name: "Shwan Ippotle", street1: "215 Clayton St.", country: "US" }, ctx);
  assertEquals(calls[0].url, "https://api.goshippo.com/addresses");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Shwan Ippotle");
  assertEquals(body.country, "US");
  // No wrapper key — the value sits at the top level of the body.
  assertEquals(body.street1, "215 Clayton St.");
});

Deno.test("address-create: `country` is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let threw = false;
  try {
    await action.execute!({ name: "x" }, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
  assertEquals(calls.length, 0);
});

Deno.test("address-create: `validate: true` is forwarded so validation runs in the same call", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { object_id: "adr_1", validation_results: { is_valid: false, messages: [] } },
  }]);
  const result = await action.execute!(
    { name: "x", street1: "y", country: "US", validate: true },
    ctx,
  ) as { validation_results?: { is_valid?: boolean } };
  assertEquals(JSON.parse(calls[0].body!).validate, true);
  assertEquals(result.validation_results?.is_valid, false);
});

Deno.test("address-create: logs the address id, not the street or name", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { object_id: "adr_1" } }]);
  await action.execute!({ name: "Shwan Ippotle", street1: "215 Clayton St.", country: "US" }, ctx);
  assert(!JSON.stringify(logs).includes("Clayton"), JSON.stringify(logs));
  assert(!JSON.stringify(logs).includes("Ippotle"), JSON.stringify(logs));
  assertEquals(logs[0].data, { addressId: "adr_1" });
});
