import { assertEquals } from "@std/assert";
import scopeGet from "../../actions/scope-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const GLOBAL = [{ ref_type: null, ref_id: null, permissions: ["all"] }];
const SPACE = [{
  ref_type: "space",
  ref_id: 42,
  permissions: ["read", "write"],
  ref_data: { name: "Sales" },
}];

Deno.test("scope-get: GETs /oauth/scope with no parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: SPACE }]);
  assertEquals(await scopeGet.execute({}, ctx), { scope: SPACE });
  assertEquals(pathOf(calls[0].url), "/oauth/scope");
  assertEquals(calls[0].method, "GET");
});

/** The degenerate global grant is a real, documented answer, not an empty one. */
Deno.test("scope-get: a global grant comes through as Podio spells it", async () => {
  const { ctx } = mockCtx([{ body: GLOBAL }]);
  assertEquals(await scopeGet.execute({}, ctx), { scope: GLOBAL });
});

Deno.test("scope-get: declares no params, so a host can invoke it with {}", () => {
  assertEquals(scopeGet.params, []);
  assertEquals(scopeGet.type, "read");
});

Deno.test("scope-get: an empty body yields an empty list", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await scopeGet.execute({}, ctx), { scope: [] });
});
