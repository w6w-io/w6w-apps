import { assertEquals } from "@std/assert";
import webinarList from "../../actions/webinar-list.ts";
import { mockCtxWithOrganizer, pathOf, queryOf } from "../_helpers.ts";

Deno.test("webinar-list: requires fromTime/toTime and pages with `size`, not `limit`", async () => {
  const { ctx, calls } = mockCtxWithOrganizer([
    { body: { _embedded: { webinars: [{ webinarKey: "1" }] } } },
  ], "org-1");
  const out = await webinarList.execute({
    fromTime: "2026-01-01T00:00:00Z",
    toTime: "2026-02-01T00:00:00Z",
    page: 0,
    size: 25,
  }, ctx) as { webinars: unknown[] };

  assertEquals(pathOf(calls[0].url), "/G2W/rest/v2/organizers/org-1/webinars");
  const q = queryOf(calls[0].url);
  assertEquals(q.fromTime, "2026-01-01T00:00:00Z");
  assertEquals(q.toTime, "2026-02-01T00:00:00Z");
  assertEquals(q.size, "25");
  assertEquals("limit" in q, false, "GoTo Webinar's list endpoint uses `size`, not `limit`");
  assertEquals(out.webinars, [{ webinarKey: "1" }]);
});

Deno.test("webinar-list: unwraps _embedded.webinars, defaulting to an empty array", async () => {
  const { ctx } = mockCtxWithOrganizer([{ body: {} }], "org-1");
  const out = await webinarList.execute(
    { fromTime: "2026-01-01T00:00:00Z", toTime: "2026-02-01T00:00:00Z" },
    ctx,
  ) as { webinars: unknown[] };
  assertEquals(out.webinars, []);
});
