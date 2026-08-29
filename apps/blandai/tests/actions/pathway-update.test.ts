import { assertEquals } from "@std/assert";
import pathwayUpdate from "../../actions/pathway-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pathway-update: posts to /v1/pathway/{id} with only the set fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "success" } }]);
  const out = await pathwayUpdate.execute({ pathwayId: "p-1", name: "Renamed" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(pathOf(calls[0].url), "/v1/pathway/p-1");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed" });
  assertEquals(out.status, "success");
});

Deno.test("pathway-update: parses nodes/edges JSON params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "success" } }]);
  await pathwayUpdate.execute({
    pathwayId: "p-1",
    nodes: '[{"id":"1"}]',
    edges: [{ id: "e1" }],
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.nodes, [{ id: "1" }]);
  assertEquals(body.edges, [{ id: "e1" }]);
});

Deno.test("pathway-update: is declared idempotent", () => {
  assertEquals(pathwayUpdate.idempotent, true);
});
