import { assertEquals } from "@std/assert";
import stageUpdate from "../../actions/stage-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("stage-update: POSTs a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "Renamed", key: "5001" } }]);
  await stageUpdate.execute({ pipelineKey: "p1", stageKey: "5001", name: "Renamed" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/pipelines/p1/stages/5001");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed" });
});
