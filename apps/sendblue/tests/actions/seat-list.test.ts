import { assertEquals } from "@std/assert";
import seatList from "../../actions/seat-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("seat-list: GETs /api/v2/seats with the email filter", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ seat_id: "s1" }] }]);
  await seatList.execute({ email: "jane@acme.com" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/seats");
  assertEquals(queryOf(calls[0].url), { email: "jane@acme.com" });
});
