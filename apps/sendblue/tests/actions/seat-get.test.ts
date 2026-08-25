import { assertEquals } from "@std/assert";
import seatGet from "../../actions/seat-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("seat-get: GETs /api/v2/seats/{seat_id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK", seat: { seat_id: "s1" } } }]);
  await seatGet.execute({ seatId: "s1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/seats/s1");
});
