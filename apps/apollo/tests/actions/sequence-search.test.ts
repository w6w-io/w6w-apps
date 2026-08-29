import { assertEquals } from "@std/assert";
import sequenceSearch from "../../actions/sequence-search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("sequence-search: POSTs to /emailer_campaigns/search with query params", async () => {
  const { ctx, calls } = mockCtx([
    { body: { emailer_campaigns: [{ id: "seq1" }], pagination: { total_entries: 1 } } },
  ]);
  const out = await sequenceSearch.execute({ q_name: "Outbound" }, ctx) as {
    sequences: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/api/v1/emailer_campaigns/search");
  assertEquals(queryOf(calls[0].url).q_name, "Outbound");
  assertEquals(calls[0].body, null);
  assertEquals(out.sequences.length, 1);
});
