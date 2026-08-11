import { assertEquals } from "@std/assert";
import runDatasetItemsGet from "../../actions/run-dataset-items-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("run-dataset-items-get: reads the run's default dataset as a bare array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ url: "a" }] }]);
  const out = await runDatasetItemsGet.execute({ runId: "r1", limit: 100 }, ctx) as {
    items: unknown[];
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/actor-runs/r1/dataset/items");
  assertEquals(out.items, [{ url: "a" }]);
});

Deno.test("run-dataset-items-get: shaping params reach the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await runDatasetItemsGet.execute(
    { runId: "r1", limit: 10, offset: 5, desc: true, omit: "#debug", flatten: "meta" },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {
    limit: "10",
    offset: "5",
    desc: "1",
    omit: "#debug",
    flatten: "meta",
  });
});

Deno.test("run-dataset-items-get: an empty body yields an empty item list, not undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  const out = await runDatasetItemsGet.execute({ runId: "r1" }, ctx) as { items: unknown[] };
  assertEquals(out.items, []);
});
