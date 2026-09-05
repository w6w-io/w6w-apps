import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search-people.ts";

Deno.test("search-people: POSTs to /searches/people", async () => {
  const query = [{ type: "predicate", field_id: "name", operator_id: "contains", values: ["ada"] }];
  const { ctx, calls } = mockCtx([{ status: 200, body: { count: 0, entities: [] } }]);
  await action.execute!({ fieldIds: "identifier,name", query: JSON.stringify(query) }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.crunchbase.com/v4/data/searches/people");
  assertEquals(JSON.parse(calls[0].body!).query, query);
});

Deno.test("search-people: a 403 on a Basic-tier key surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: [{ status: 403, code: "LA403", message: "Insufficient package access" }],
  }]);
  await assertRejects(
    async () =>
      await action.execute!(
        {
          fieldIds: "name",
          query: JSON.stringify([
            { type: "predicate", field_id: "name", operator_id: "contains", values: ["a"] },
          ]),
        },
        ctx,
      ),
    Error,
    "Crunchbase 403 for POST /data/searches/people: Insufficient package access LA403",
  );
});
