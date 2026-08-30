import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-workspace.ts";

Deno.test("create-workspace: POSTs /groups?workspaceV2=true with { name }", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "w1", name: "sample" }] } }]);
  await action.execute({ name: "sample" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1.0/myorg/groups");
  assertEquals(url.searchParams.get("workspaceV2"), "true");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "sample" });
});

Deno.test("create-workspace: unwraps the documented `{ value: [Group] }` response shape", async () => {
  const { ctx } = mockCtx([{ body: { value: [{ id: "w1", name: "sample" }] } }]);
  const out = await action.execute({ name: "sample" }, ctx);
  assertEquals(out, { id: "w1", name: "sample" });
});

Deno.test("create-workspace: falls back to the raw body if the response is ever a bare object instead", async () => {
  const { ctx } = mockCtx([{ body: { id: "w1", name: "sample" } }]);
  const out = await action.execute({ name: "sample" }, ctx);
  assertEquals(out, { id: "w1", name: "sample" });
});

Deno.test("create-workspace: mints a new workspace on every call — not idempotent", () => {
  assertEquals(action.idempotent, false);
});
