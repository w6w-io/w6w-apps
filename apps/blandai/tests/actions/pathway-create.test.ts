import { assertEquals } from "@std/assert";
import pathwayCreate from "../../actions/pathway-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pathway-create: posts to /v1/pathway/create and returns the new id", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { status: "success", pathway_id: "p-new" },
  }]);
  const out = await pathwayCreate.execute({ name: "New Pathway" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v1/pathway/create");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { name: "New Pathway" });
  assertEquals(out.pathwayId, "p-new");
});

Deno.test("pathway-create: includes description when provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "success", pathway_id: "p-1" } }]);
  await pathwayCreate.execute({ name: "N", description: "D" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "N", description: "D" });
});

Deno.test("pathway-create: is declared not idempotent", () => {
  assertEquals(pathwayCreate.idempotent, false);
});
