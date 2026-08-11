import { assert, assertEquals } from "@std/assert";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/bite-get.ts";

const OK = { data: { bite: { id: "b1" } } };

Deno.test("bite-get: queries by ID! and returns the media sources", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ biteId: "b1" }, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("query Bite($biteId: ID!)"));
  assert(query.includes("sources { src type }"));
  assertEquals(variables, { biteId: "b1" });
});

Deno.test("bite-get: captions are opt-in", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }, { body: OK }]);
  await action.execute({ biteId: "b1" }, ctx);
  assert(!sent(calls[0]).query.includes("captions {"));
  await action.execute({ biteId: "b1", includeCaptions: true }, ctx);
  assert(sent(calls[1]).query.includes("captions {"));
});
