import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search-organizations.ts";

const query = [{ type: "predicate", field_id: "name", operator_id: "contains", values: ["acme"] }];

Deno.test("search-organizations: POSTs field_ids and query to the right path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { count: 0, entities: [] } }]);
  await action.execute!(
    { fieldIds: "identifier, name", query: JSON.stringify(query) },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.crunchbase.com/v4/data/searches/organizations");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.field_ids, ["identifier", "name"]);
  assertEquals(body.query, query);
});

Deno.test("search-organizations: order, limit and cursors are optional and pass through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(
    {
      fieldIds: "name",
      query: JSON.stringify(query),
      order: JSON.stringify([{ field_id: "rank_org", sort: "asc" }]),
      limit: 50,
      afterId: "5972288b-8188-475a-b153-1b6eb4d57fb1",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.order, [{ field_id: "rank_org", sort: "asc" }]);
  assertEquals(body.limit, 50);
  assertEquals(body.after_id, "5972288b-8188-475a-b153-1b6eb4d57fb1");
  assert(!("before_id" in body));
});

Deno.test("search-organizations: fieldIds and query are both required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ query: JSON.stringify(query) }, ctx),
    Error,
    "`fieldIds`",
  );
  await assertRejects(
    async () => await action.execute!({ fieldIds: "name" }, ctx),
    Error,
    "`query`",
  );
  assertEquals(calls.length, 0);
});

Deno.test("search-organizations: a money-typed predicate value passes through as an object", async () => {
  const moneyQuery = [
    {
      type: "predicate",
      field_id: "funding_total",
      operator_id: "gte",
      values: [{ value: 1e7, currency: "usd" }],
    },
  ];
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ fieldIds: "name", query: JSON.stringify(moneyQuery) }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.query[0].values[0], { value: 1e7, currency: "usd" });
});

Deno.test("search-organizations: malformed query JSON is rejected", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ fieldIds: "name", query: "{not json" }, ctx),
    Error,
    "not valid JSON",
  );
});
