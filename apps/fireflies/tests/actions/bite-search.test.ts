import { assert, assertEquals } from "@std/assert";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/bite-search.ts";

const OK = { data: { bites: [{ id: "b1" }] } };

Deno.test("bite-search: sends the scope selectors as variables", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ mine: true, transcriptId: "t1" }, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("bites(mine: $mine, my_team: $myTeam, transcript_id: $transcriptId"));
  assertEquals(variables, { mine: true, transcriptId: "t1" });
});

Deno.test("bite-search: `mine: false` survives compaction", async () => {
  // Fireflies rejects this query with `args_required` unless one of mine /
  // my_team / transcript_id is present, so dropping an explicit `false` would
  // turn a valid narrowing into a hard error.
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ mine: false, myTeam: true }, ctx);
  assertEquals(sent(calls[0]).variables, { mine: false, myTeam: true });
});

Deno.test("bite-search: pagination is inlined as integer literals", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ mine: true, limit: 5, skip: 10 }, ctx);
  const { query } = sent(calls[0]);
  assert(query.includes("limit: 5"));
  assert(query.includes("skip: 10"));
  assert(!query.includes("$limit"));
});

Deno.test("bite-search: defaults to `mine` so the first run is not an args_required error", () => {
  assertEquals(action.params!.find((p) => p.key === "mine")!.default, true);
});
