import { assertEquals } from "@std/assert";
import holdList from "../../actions/hold-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("hold-list: hits GET /holds, filterable by event", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ id: "ho_1" }]) }]);
  await holdList.execute({ eventId: "ev_1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/holds");
  assertEquals(queryOf(calls[0].url), { event_id: "ev_1" });
});
