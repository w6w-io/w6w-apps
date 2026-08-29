import { assertEquals } from "@std/assert";
import pathwayList from "../../actions/pathway-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pathway-list: passes through a bare array response", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ name: "A" }, { name: "B" }] }]);
  const out = await pathwayList.execute({}, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v1/pathway");
  assertEquals(out.pathways, [{ name: "A" }, { name: "B" }]);
});

Deno.test("pathway-list: unwraps a {pathways: [...]} envelope", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { pathways: [{ name: "A" }] } }]);
  const out = await pathwayList.execute({}, ctx) as Record<string, unknown>;
  assertEquals(out.pathways, [{ name: "A" }]);
});

Deno.test("pathway-list: wraps a single pathway object, matching the vendor doc literally", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { name: "Default Demo Pathway", nodes: [], edges: [] },
  }]);
  const out = await pathwayList.execute({}, ctx) as Record<string, unknown>;
  assertEquals(out.pathways, [{ name: "Default Demo Pathway", nodes: [], edges: [] }]);
});

Deno.test("pathway-list: an empty/null body reports no pathways", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  const out = await pathwayList.execute({}, ctx) as Record<string, unknown>;
  assertEquals(out.pathways, []);
});
