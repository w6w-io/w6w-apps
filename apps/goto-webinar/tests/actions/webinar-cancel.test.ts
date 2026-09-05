import { assertEquals } from "@std/assert";
import webinarCancel from "../../actions/webinar-cancel.ts";
import { mockCtxWithOrganizer, pathOf, queryOf } from "../_helpers.ts";

Deno.test("webinar-cancel: DELETEs /organizers/{organizerKey}/webinars/{webinarKey}", async () => {
  const { ctx, calls } = mockCtxWithOrganizer([{ status: 204 }], "org-1");
  const out = await webinarCancel.execute({ webinarKey: "9" }, ctx);
  assertEquals(pathOf(calls[0].url), "/G2W/rest/v2/organizers/org-1/webinars/9");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 204 });
});

Deno.test("webinar-cancel: omitting sendCancellationEmails/deleteAll leaves them off the wire, letting GoTo's own documented defaults apply", async () => {
  const { ctx, calls } = mockCtxWithOrganizer([{ status: 204 }], "org-1");
  await webinarCancel.execute({ webinarKey: "9" }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals("sendCancellationEmails" in q, false);
  assertEquals("deleteAll" in q, false);
});

Deno.test("webinar-cancel: explicit values are forwarded verbatim", async () => {
  const { ctx, calls } = mockCtxWithOrganizer([{ status: 204 }], "org-1");
  await webinarCancel.execute(
    { webinarKey: "9", sendCancellationEmails: true, deleteAll: false },
    ctx,
  );
  const q = queryOf(calls[0].url);
  assertEquals(q.sendCancellationEmails, "true");
  assertEquals(q.deleteAll, "false");
});
