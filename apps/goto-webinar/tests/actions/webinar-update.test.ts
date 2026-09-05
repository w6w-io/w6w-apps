import { assertEquals } from "@std/assert";
import webinarUpdate from "../../actions/webinar-update.ts";
import { mockCtxWithOrganizer, pathOf, queryOf } from "../_helpers.ts";

Deno.test("webinar-update: PUTs and reports the vendor's actual 202 status", async () => {
  const { ctx, calls } = mockCtxWithOrganizer([{ status: 202 }], "org-1");
  const out = await webinarUpdate.execute({ webinarKey: "9", subject: "New subject" }, ctx);

  assertEquals(pathOf(calls[0].url), "/G2W/rest/v2/organizers/org-1/webinars/9");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { subject: "New subject" });
  assertEquals(out, { status: 202 });
});

Deno.test("webinar-update: passes notifyParticipants as a query param", async () => {
  const { ctx, calls } = mockCtxWithOrganizer([{ status: 202 }], "org-1");
  await webinarUpdate.execute({ webinarKey: "9", notifyParticipants: true }, ctx);
  assertEquals(queryOf(calls[0].url).notifyParticipants, "true");
});
