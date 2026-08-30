import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/segment-create.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

Deno.test("segment-create: POSTs to /segments/new", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { list: { id: 9 } } }], conn);
  await action.execute!({ name: "VIP Customers", isGlobal: true }, ctx);
  assertEquals(calls[0].url, "https://mautic.example.com/api/segments/new");
  assertEquals(JSON.parse(calls[0].body!), { name: "VIP Customers", isGlobal: true });
});

Deno.test("segment-create: filters is parsed from JSON and passed through", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { list: {} } }], conn);
  await action.execute!({
    name: "High scorers",
    filters:
      '[{"glue":"and","field":"points","object":"lead","type":"number","operator":"gte","properties":{"filter":"100"}}]',
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.filters[0].field, "points");
});

Deno.test("segment-create: a name is required, before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  const err = await assertRejects(async () => await action.execute!({}, ctx), Error);
  assert(err.message.includes("name"), err.message);
  assertEquals(calls.length, 0);
});
