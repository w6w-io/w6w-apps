import { assertEquals } from "@std/assert";
import { mockCalendarCtx } from "../_helpers.ts";
import action from "../../actions/freebusy-get.ts";

Deno.test("freebusy-get: GETs /calendars/freebusy with uemail/sdate/edate", async () => {
  const { ctx, calls } = mockCalendarCtx([{ body: { "20170419": [null, ["08:00-09:00"]] } }]);
  await action.execute(
    { email: "user@zylker.com", start: "20170419T000000", end: "20170420T000000" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/calendars/freebusy");
  assertEquals(url.searchParams.get("uemail"), "user@zylker.com");
  assertEquals(url.searchParams.get("sdate"), "20170419T000000");
  assertEquals(url.searchParams.get("edate"), "20170420T000000");
  assertEquals(url.searchParams.has("ftype"), false);
});

Deno.test("freebusy-get: passes ftype through when set", async () => {
  const { ctx, calls } = mockCalendarCtx([{ body: {} }]);
  await action.execute(
    {
      email: "user@zylker.com",
      start: "20170419T000000",
      end: "20170420T000000",
      type: "timebased",
    },
    ctx,
  );
  assertEquals(new URL(calls[0].url).searchParams.get("ftype"), "timebased");
});
