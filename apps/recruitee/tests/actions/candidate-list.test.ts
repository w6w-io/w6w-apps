import { assertEquals, assertRejects } from "@std/assert";
import candidateList from "../../actions/candidate-list.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("candidate-list: builds the query from every filter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { candidates: [], references: [] } }]);
  await candidateList.execute({
    query: "jane",
    sort: "by_last_message",
    limit: 50,
    offset: 10,
    offerId: 5,
    disqualified: true,
    deleted: false,
    qualified: true,
    createdAfter: "2026-01-01",
    ids: [1, 2, 3],
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(pathOf(calls[0].url), "/c/123/candidates");
  assertEquals(queryOf(calls[0].url), {
    query: "jane",
    sort: "by_last_message",
    limit: "50",
    offset: "10",
    offer_id: "5",
    disqualified: "true",
    qualified: "true",
    created_after: "2026-01-01",
    ids: "1,2,3",
  });
});

Deno.test("candidate-list: a false boolean is omitted, not sent as 'false'", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { candidates: [] } }]);
  await candidateList.execute({ deleted: false }, ctx);
  assertEquals(queryOf(calls[0].url).deleted, undefined);
});

Deno.test("candidate-list: returns the response body verbatim", async () => {
  const candidates = [{ id: 1, name: "Jane Doe" }];
  const { ctx } = mockCtx([{ status: 200, body: { candidates, references: [] } }]);
  const out = await candidateList.execute({}, ctx) as { candidates: unknown };
  assertEquals(out.candidates, candidates);
});

Deno.test("candidate-list: surfaces the vendor's bare-string error", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("Token not found.", "invalid_token") },
  ]);
  await assertRejects(
    async () => {
      await candidateList.execute({}, ctx);
    },
    Error,
    "invalid_token",
  );
});
