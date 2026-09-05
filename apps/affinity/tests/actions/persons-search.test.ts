import { assertEquals } from "@std/assert";
import personsSearch from "../../actions/persons-search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("persons-search: calls GET /persons?term= with a default page_size", async () => {
  const { ctx, calls } = mockCtx([{ body: { persons: [], next_page_token: null } }]);
  await personsSearch.execute({ term: "doe" }, ctx);
  assertEquals(pathOf(calls[0].url), "/persons");
  const q = queryOf(calls[0].url);
  assertEquals(q.term, "doe");
  assertEquals(q.page_size, "100");
});

Deno.test("persons-search: forwards with_interaction_dates and friends", async () => {
  const { ctx, calls } = mockCtx([{ body: { persons: [], next_page_token: null } }]);
  await personsSearch.execute(
    { withInteractionDates: true, withInteractionPersons: true, withOpportunities: true },
    ctx,
  );
  const q = queryOf(calls[0].url);
  assertEquals(q.with_interaction_dates, "true");
  assertEquals(q.with_interaction_persons, "true");
  assertEquals(q.with_opportunities, "true");
});
