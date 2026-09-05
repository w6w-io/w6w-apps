import { assert, assertEquals } from "@std/assert";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import phaseList from "../../actions/phase-list.ts";

Deno.test("phase-list: lists a pipe's phases in order", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { pipe: { phases: [{ id: "1", name: "New" }, { id: "2", name: "Done" }] } } },
  }]);
  const out = await phaseList.execute({ pipeId: "123" }, ctx) as { phases: unknown[] };
  assertEquals(out.phases.length, 2);
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assert(q.startsWith("{ pipe(id: 123) { phases {"));
  assert(q.includes("cards_count"));
});

Deno.test("phase-list: throws when the pipe does not resolve", async () => {
  const { ctx } = mockCtx([{ body: { data: { pipe: null } } }]);
  let threw = false;
  try {
    await phaseList.execute({ pipeId: "bad" }, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
});

Deno.test("phase-list: type/resource metadata", () => {
  assertEquals(phaseList.type, "read");
  assertEquals(phaseList.resource, "phase");
});
