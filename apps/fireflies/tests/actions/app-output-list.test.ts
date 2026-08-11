import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/app-output-list.ts";

const OK = { data: { apps: { outputs: [] } } };

Deno.test("app-output-list: filters travel as variables, pagination as inline literals", async () => {
  // The vendor's Arguments table says Int and its own usage example says Float
  // for skip/limit; a variable declaration has to pick one and would be wrong
  // half the time. An integer literal is valid input for both.
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ transcriptId: "t1", limit: 10, skip: 5 }, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("query AppOutputs($appId: String, $transcriptId: String)"));
  assert(query.includes("limit: 10"));
  assert(query.includes("skip: 5"));
  assert(!query.includes("$limit"));
  assert(!query.includes("$skip"));
  assertEquals(variables, { transcriptId: "t1" });
});

Deno.test("app-output-list: a fractional limit is rejected before it can reach the query", () => {
  // Inlining is only safe because a non-integer never gets interpolated.
  const { ctx, calls } = mockCtx([]);
  assertThrows(() => action.execute({ limit: 2.5 }, ctx), Error, "must be an integer");
  assertEquals(calls.length, 0);
});
