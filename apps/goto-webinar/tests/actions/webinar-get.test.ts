import { assertEquals } from "@std/assert";
import webinarGet from "../../actions/webinar-get.ts";
import { mockCtxWithOrganizer, pathOf } from "../_helpers.ts";

Deno.test("webinar-get: reads /organizers/{organizerKey}/webinars/{webinarKey}", async () => {
  const { ctx, calls } = mockCtxWithOrganizer(
    [{ body: { webinarKey: "9", subject: "Launch" } }],
    "org-1",
  );
  const out = await webinarGet.execute({ webinarKey: "9" }, ctx);
  assertEquals(pathOf(calls[0].url), "/G2W/rest/v2/organizers/org-1/webinars/9");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { webinarKey: "9", subject: "Launch" });
});
