import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-webset.ts";

Deno.test("get-webset: GETs /v0/websets/{id}", async () => {
  const body = { id: "ws_1", status: "idle", title: "EU AI startups" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ id: "ws_1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v0/websets/ws_1");
  assertEquals(calls[0].method, "GET");
  assertEquals(url.searchParams.has("expand"), false);
  assertEquals(result, body);
});

Deno.test("get-webset: sets expand=items only when expandItems is set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ws_1" } }]);
  await action.execute!({ id: "ws_1", expandItems: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("expand"), "items");
});

Deno.test("get-webset: URL-encodes the id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "my ref/1" } }]);
  await action.execute!({ id: "my ref/1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v0/websets/my%20ref%2F1");
});
