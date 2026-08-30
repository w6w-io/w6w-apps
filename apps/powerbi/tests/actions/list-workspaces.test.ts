import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-workspaces.ts";

Deno.test("list-workspaces: GETs /groups", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "w1" }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/groups");
  assertEquals(out.value, [{ id: "w1" }]);
});

Deno.test("list-workspaces: Filter/Max results/Skip ride as $filter/$top/$skip", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ filter: "contains(name,'x')", top: 5, skip: 2 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("$filter"), "contains(name,'x')");
  assertEquals(url.searchParams.get("$top"), "5");
  assertEquals(url.searchParams.get("$skip"), "2");
});

Deno.test("list-workspaces: is read-only — no create/update param surface here", () => {
  assertEquals(action.type, "read");
});
