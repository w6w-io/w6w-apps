import { assertEquals } from "@std/assert";
import roomsList from "../../actions/rooms-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("rooms-list: GETs /rooms with the office filter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: page([{ id: "1" }]) }]);
  await roomsList.execute({ officeId: "5" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/rooms");
  assertEquals(queryOf(calls[0].url), { office_id: "5" });
});
