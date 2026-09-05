import { assertEquals } from "@std/assert";
import viewSegments from "../../actions/view-segments.ts";
import { APP_ID, mockCtxWithConnection, pathOf, queryOf } from "../_helpers.ts";

Deno.test("view-segments: defaults limit 300, offset 0", async () => {
  const { ctx, calls } = mockCtxWithConnection([
    { status: 200, body: { total_count: 0, segments: [] } },
  ]);
  await viewSegments.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), `/apps/${APP_ID}/segments`);
  assertEquals(queryOf(calls[0].url), { limit: "300", offset: "0" });
});
