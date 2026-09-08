import { assertEquals, assertRejects } from "@std/assert";
import latestTimeEntryGet from "../../actions/latest-time-entry-get.ts";
import { hostOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("latest-time-entry-get: calls People(id)/LatestTimeEntry on the time-tracking host", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1", type: "In" } }]);
  const out = await latestTimeEntryGet.execute({ personId: "p1" }, ctx) as { type: string };
  assertEquals(hostOf(calls[0].url), "https://time-tracking.prod.jibble.io");
  assertEquals(pathOf(calls[0].url), "/v1/People(p1)/LatestTimeEntry");
  assertEquals(out.type, "In");
});

Deno.test("latest-time-entry-get: requires personId", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(latestTimeEntryGet.execute({ personId: "" }, ctx)),
    Error,
    "personId",
  );
});
