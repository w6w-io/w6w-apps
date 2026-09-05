import { assertEquals } from "@std/assert";
import webinarCreate from "../../actions/webinar-create.ts";
import { mockCtxWithOrganizer, pathOf } from "../_helpers.ts";

Deno.test("webinar-create: posts to /organizers/{organizerKey}/webinars with the given body", async () => {
  const { ctx, calls } = mockCtxWithOrganizer([{ body: { webinarKey: "1" } }], "org-1");
  const out = await webinarCreate.execute({
    subject: "Launch",
    times: [{ startTime: "2026-10-01T10:00:00Z", endTime: "2026-10-01T11:00:00Z" }],
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/G2W/rest/v2/organizers/org-1/webinars");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.subject, "Launch");
  assertEquals(body.times.length, 1);
  assertEquals("description" in body, false, "unset fields must not be sent as empty strings");
  assertEquals(out, { webinarKey: "1" });
});

Deno.test("webinar-create: an explicit organizerKey param overrides the connection's", async () => {
  const { ctx, calls } = mockCtxWithOrganizer(
    [{ body: { webinarKey: "1" } }],
    "org-from-connection",
  );
  await webinarCreate.execute({
    organizerKey: "org-from-param",
    subject: "Launch",
    times: [{ startTime: "2026-10-01T10:00:00Z", endTime: "2026-10-01T11:00:00Z" }],
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/G2W/rest/v2/organizers/org-from-param/webinars");
});
