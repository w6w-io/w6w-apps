import { assertEquals } from "@std/assert";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/domain-search.ts";

Deno.test("domain-search: GETs /domain-search with the domain and pagination", async () => {
  const body = envelope({ domain: "intercom.com", emails: [] }, { results: 35 });
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ domain: "intercom.com", limit: 25 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/domain-search");
  const q = queryOf(calls[0].url);
  assertEquals(q.domain, "intercom.com");
  assertEquals(q.limit, "25");
  assertEquals(result, body);
});

Deno.test("domain-search: joins multiselect seniority/department into comma lists", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await action.execute!({
    domain: "stripe.com",
    seniority: ["junior", "senior"],
    department: ["it", "sales"],
  }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals(q.seniority, "junior,senior");
  assertEquals(q.department, "it,sales");
});

Deno.test("domain-search: an explicit decisionMaker=false is sent, not dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await action.execute!({ domain: "stripe.com", decisionMaker: false }, ctx);
  assertEquals(queryOf(calls[0].url).decision_maker, "false");
});

Deno.test("domain-search: a domain with no hits still returns 200 with nulls (no throw)", async () => {
  const body = envelope({ domain: null, pattern: null, organization: null, emails: [] }, {
    results: 0,
  });
  const { ctx } = mockCtx([{ body }]);
  const result = await action.execute!({ domain: "example.com" }, ctx);
  assertEquals(result, body);
});
