import { assertEquals } from "@std/assert";
import vendorGet from "../../actions/vendor-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("vendor-get: calls GET /vendor.json and returns the single account record", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uuid: "v1", name: "Acme Plumbing" }] }]);
  const out = await vendorGet.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api_1.0/vendor.json");
  assertEquals(out, { uuid: "v1", name: "Acme Plumbing" });
});

Deno.test("vendor-get: returns null rather than throwing on an empty array", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  const out = await vendorGet.execute({}, ctx);
  assertEquals(out, null);
});

Deno.test("vendor-get: requires no params", () => {
  assertEquals(vendorGet.params, []);
});
