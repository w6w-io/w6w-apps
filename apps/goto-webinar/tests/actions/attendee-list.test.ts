import { assertEquals } from "@std/assert";
import attendeeList from "../../actions/attendee-list.ts";
import { mockCtxWithOrganizer, pathOf } from "../_helpers.ts";

Deno.test("attendee-list: unwraps _embedded.attendeeParticipationResponses", async () => {
  const { ctx, calls } = mockCtxWithOrganizer(
    [{ body: { _embedded: { attendeeParticipationResponses: [{ registrantKey: 1 }] } } }],
    "org-1",
  );
  const out = await attendeeList.execute({ webinarKey: "9" }, ctx) as { attendees: unknown[] };
  assertEquals(pathOf(calls[0].url), "/G2W/rest/v2/organizers/org-1/webinars/9/attendees");
  assertEquals(out.attendees, [{ registrantKey: 1 }]);
});

Deno.test("attendee-list: defaults to an empty array when _embedded is absent", async () => {
  const { ctx } = mockCtxWithOrganizer([{ body: {} }], "org-1");
  const out = await attendeeList.execute({ webinarKey: "9" }, ctx) as { attendees: unknown[] };
  assertEquals(out.attendees, []);
});
