import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search-funding-rounds.ts";

Deno.test("search-funding-rounds: POSTs to /searches/funding_rounds", async () => {
  const query = [
    {
      type: "predicate",
      field_id: "money_raised",
      operator_id: "gte",
      values: [{ value: 10000000, currency: "usd" }],
    },
  ];
  const { ctx, calls } = mockCtx([{ status: 200, body: { count: 0, entities: [] } }]);
  await action.execute!(
    { fieldIds: "identifier,announced_on,money_raised", query: JSON.stringify(query) },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.crunchbase.com/v4/data/searches/funding_rounds");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.field_ids, ["identifier", "announced_on", "money_raised"]);
  assertEquals(body.query[0].values[0], { value: 10000000, currency: "usd" });
});

Deno.test("search-funding-rounds: before_id paginates backward", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(
    {
      fieldIds: "identifier",
      query: JSON.stringify([
        { type: "predicate", field_id: "identifier", operator_id: "blank", values: ["false"] },
      ]),
      beforeId: "6bc24ac4-e062-458b-b70c-b4cb5918439c",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.before_id, "6bc24ac4-e062-458b-b70c-b4cb5918439c");
});
