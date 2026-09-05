import { assertEquals } from "@std/assert";
import registrantList from "../../actions/registrant-list.ts";
import { formOf, mockWebinarJamCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("registrant-list: reads the Laravel-paginator shape, not the stale flat field table", async () => {
  const row = {
    id: 841,
    lead_id: 299,
    schedule_id: 938,
    first_name: "Test",
    email: "test@test.com",
    webinar: "WebinarJam Test Webinar",
    schedule: "Fri, 31 Oct 2025, 12:00 PM",
    attended_live: "No",
    subscribed: "Yes",
    links: {
      live_room: "https://event.webinarjam.com/go/live/x",
      replay_room: "https://event.webinarjam.com/go/replay/x",
      unsubscribe: "https://event.webinarjam.com/unsubscribe/x",
    },
  };
  const { ctx, calls } = mockWebinarJamCtx([{
    body: ok({ registrants: { current_page: 1, data: [row] } }),
  }]);
  const out = await registrantList.execute({ product: "webinarjam", webinarId: 556 }, ctx) as {
    currentPage: number;
    registrants: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/webinarjam/registrants");
  assertEquals(formOf(calls[0].body).webinar_id, "556");
  assertEquals(out.currentPage, 1);
  assertEquals(out.registrants, [row]);
});

Deno.test("registrant-list: filter fields, including the 0-valued 'all' options, reach the wire", async () => {
  const { ctx, calls } = mockWebinarJamCtx([{ body: ok({ registrants: { data: [] } }) }]);
  await registrantList.execute({
    product: "webinarjam",
    webinarId: 556,
    scheduleId: 903,
    attendedLive: 0,
    attendedReplay: 2,
    purchased: 0,
    page: 1,
    dateRange: 5,
    search: "jane",
  }, ctx);
  const sent = formOf(calls[0].body);
  assertEquals(sent.schedule_id, "903");
  // `0` ("All registrants") must survive — dropping it would make the option unreachable.
  assertEquals(sent.attended_live, "0");
  assertEquals(sent.attended_replay, "2");
  assertEquals(sent.purchased, "0");
  assertEquals(sent.date_range, "5");
  assertEquals(sent.search, "jane");
});

Deno.test("registrant-list: an empty page returns an empty array, not undefined", async () => {
  const { ctx } = mockWebinarJamCtx([{ body: ok({ registrants: {} }) }]);
  const out = await registrantList.execute({ product: "webinarjam", webinarId: 1 }, ctx) as {
    registrants: unknown[];
  };
  assertEquals(out.registrants, []);
});

Deno.test("registrant-list: is a search, not a read or a perform", () => {
  assertEquals(registrantList.type, "search");
});
