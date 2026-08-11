import { assert, assertEquals } from "@std/assert";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/transcript-search.ts";

const OK = { data: { transcripts: [{ id: "t1" }] } };

Deno.test("transcript-search: sends filters as variables", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({
    keyword: "pricing",
    scope: "all",
    fromDate: "2026-07-01T00:00:00.000Z",
    mine: true,
  }, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("transcripts("));
  assertEquals(variables, {
    keyword: "pricing",
    scope: "all",
    fromDate: "2026-07-01T00:00:00.000Z",
    mine: true,
  });
});

Deno.test("transcript-search: pagination is inlined as integer literals, not variables", async () => {
  // Fireflies' docs disagree with themselves on Int vs Float for these; an
  // integer literal is valid input for either.
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ limit: 10, skip: 20 }, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("limit: 10"));
  assert(query.includes("skip: 20"));
  assert(!query.includes("$limit"));
  assertEquals(variables, {});
});

Deno.test("transcript-search: comma-separated people become arrays", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ organizers: "a@x.com, b@x.com", participants: "c@x.com" }, ctx);
  const { variables } = sent(calls[0]);
  assertEquals(variables.organizers, ["a@x.com", "b@x.com"]);
  assertEquals(variables.participants, ["c@x.com"]);
});

Deno.test("transcript-search: exposes no deprecated arguments", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({}, ctx);
  const { query } = sent(calls[0]);
  // `title`, `organizer_email`, `participant_email` and `date` are all
  // documented as deprecated on this query.
  assert(!query.includes("organizer_email:"));
  assert(!query.includes("participant_email:"));
  assert(!query.includes("date: $"));
  assertEquals(action.params!.some((p) => p.key === "title"), false);
});

Deno.test("transcript-search: summaries are opt-in for a list", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }, { body: OK }]);
  await action.execute({}, ctx);
  assert(!sent(calls[0]).query.includes("summary {"));
  await action.execute({ includeSummary: true }, ctx);
  assert(sent(calls[1]).query.includes("summary {"));
});
