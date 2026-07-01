import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-calendars.ts";

Deno.test("list-calendars: GETs /users/me/calendarList with default maxResults", async () => {
  const body = { items: [{ id: "primary" }], nextPageToken: "tok" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/calendar/v3/users/me/calendarList");
  assertEquals(url.searchParams.get("maxResults"), "100");
  assertEquals(result, body);
});

Deno.test("list-calendars: forwards optional filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!({
    maxResults: 25,
    pageToken: "next",
    showHidden: true,
    minAccessRole: "writer",
  }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("maxResults"), "25");
  assertEquals(params.get("pageToken"), "next");
  assertEquals(params.get("showHidden"), "true");
  assertEquals(params.get("minAccessRole"), "writer");
});

Deno.test("list-calendars: omits unset filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!({}, ctx);
  const params = new URL(calls[0].url).searchParams;
  assert(!params.has("pageToken"));
  assert(!params.has("showHidden"));
  assert(!params.has("minAccessRole"));
});
