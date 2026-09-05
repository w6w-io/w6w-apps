import { assert, assertEquals } from "@std/assert";
import customerList from "../../actions/customer-list.ts";
import customerGet from "../../actions/customer-get.ts";
import customerCreate from "../../actions/customer-create.ts";
import customerUpdate from "../../actions/customer-update.ts";
import { envelope, listEnvelope, mockCtx } from "../_helpers.ts";

Deno.test("customer-list: filter[store_id] and filter[email] both survive", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await customerList.execute({ storeId: "1", email: "a@b.com" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filter[store_id]"), "1");
  assertEquals(url.searchParams.get("filter[email]"), "a@b.com");
});

Deno.test("customer-get: GET /v1/customers/:id", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "customers" }) }]);
  await customerGet.execute({ customerId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/customers/1");
});

Deno.test("customer-create: POST with a store relationship and compacted attributes", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "customers" }) }]);
  await customerCreate.execute(
    { storeId: "1", name: "John Doe", email: "john@example.com" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.type, "customers");
  assertEquals(body.data.attributes, { name: "John Doe", email: "john@example.com" });
  assertEquals(body.data.relationships.store, { data: { type: "stores", id: "1" } });
});

Deno.test("customer-update: PATCH sends only the filled-in fields, plus the id", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "customers" }) }]);
  await customerUpdate.execute({ customerId: "1", email: "new@example.com" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/v1/customers/1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.id, "1");
  assertEquals(body.data.attributes, { email: "new@example.com" });
});

Deno.test("customer-update: archive maps to status: archived, the only settable status", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "customers" }) }]);
  await customerUpdate.execute({ customerId: "1", archive: true }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.attributes.status, "archived");
});

Deno.test("customer-update: no fields filled in sends no attributes at all", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "customers" }) }]);
  await customerUpdate.execute({ customerId: "1" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assert(Object.keys(body.data.attributes).length === 0);
});
