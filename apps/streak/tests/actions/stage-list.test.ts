import { assertEquals } from "@std/assert";
import stageList from "../../actions/stage-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * Streak answers this one keyed by stage id, not as an array — the single
 * exception among this app's list endpoints (see lib/client.ts). This test
 * pins the normalisation to a plain array.
 */
Deno.test("stage-list: normalises the keyed-by-id object into an array", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "5001": { name: "Resume", key: "5001" }, "5002": { name: "Interview", key: "5002" } },
  }]);
  const out = await stageList.execute({ pipelineKey: "p1" }, ctx) as { results: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/v1/pipelines/p1/stages");
  assertEquals(out.results.length, 2);
  assertEquals(
    out.results.map((s) => (s as { key: string }).key).sort(),
    ["5001", "5002"],
  );
});

Deno.test("stage-list: an empty object comes back as an empty array", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const out = await stageList.execute({ pipelineKey: "p1" }, ctx) as { results: unknown[] };
  assertEquals(out.results, []);
});
