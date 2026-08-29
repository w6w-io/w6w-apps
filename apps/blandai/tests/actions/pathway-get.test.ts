import { assertEquals } from "@std/assert";
import pathwayGet from "../../actions/pathway-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pathway-get: fetches by id and maps nodes/edges", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { name: "Demo", description: null, nodes: [{ id: "1" }], edges: [{ id: "e1" }] },
  }]);
  const out = await pathwayGet.execute({ pathwayId: "p-1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v1/pathway/p-1");
  assertEquals(out.name, "Demo");
  assertEquals(out.nodes, [{ id: "1" }]);
  assertEquals(out.edges, [{ id: "e1" }]);
});

Deno.test("pathway-get: defaults nodes/edges to empty arrays when absent", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { name: "Demo" } }]);
  const out = await pathwayGet.execute({ pathwayId: "p-1" }, ctx) as Record<string, unknown>;
  assertEquals(out.nodes, []);
  assertEquals(out.edges, []);
});
