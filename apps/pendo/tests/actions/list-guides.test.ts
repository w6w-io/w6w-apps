import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-guides.ts";

Deno.test("list-guides: fetches every guide when no ids given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "g1" }] }]);
  const result = await action.execute!({}, ctx) as { guides: unknown[] };
  assertEquals(calls[0].url, "https://app.pendo.io/api/v1/guide");
  assertEquals(result.guides, [{ id: "g1" }]);
});

Deno.test("list-guides: filters by ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!({ ids: "g1,g2" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("id"), "g1,g2");
});
