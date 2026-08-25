import { assertEquals } from "@std/assert";
import seatCount from "../../actions/seat-count.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("seat-count: GETs /api/v2/seats/count", async () => {
  const { ctx, calls } = mockCtx([{ body: { count: 12 } }]);
  const out = await seatCount.execute({}, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/api/v2/seats/count");
  assertEquals(out.count, 12);
});
