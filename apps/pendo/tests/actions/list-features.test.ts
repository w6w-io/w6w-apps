import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-features.ts";

Deno.test("list-features: fetches every feature when no ids given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "f1" }] }]);
  const result = await action.execute!({}, ctx) as { features: unknown[] };
  assertEquals(calls[0].url, "https://app.pendo.io/api/v1/feature");
  assertEquals(result.features, [{ id: "f1" }]);
});

Deno.test("list-features: filters by comma-separated ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!({ ids: ["f1", "f2"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("id"), "f1,f2");
});
