import { assertEquals } from "@std/assert";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/domain-finder.ts";

Deno.test("domain-finder: GETs /domain-finder with the company name", async () => {
  const body = envelope([{ domain: "stripe.com", company_name: "Stripe", email_count: 281 }], {
    results: 1,
  });
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ company: "stripe" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/domain-finder");
  assertEquals(queryOf(calls[0].url).company, "stripe");
  assertEquals(result, body);
});

Deno.test("domain-finder: forwards limit and perfectMatch", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await action.execute!({ company: "stripe", limit: 3, perfectMatch: true }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals(q.limit, "3");
  assertEquals(q.perfect_match, "true");
});
