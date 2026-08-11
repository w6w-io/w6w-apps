import { assertEquals } from "@std/assert";
import subscriberGet from "../../actions/subscriber-get.ts";
import { API_PATH, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("subscriber-get: GETs /subscribers/{listid}.json with the address in the query", async () => {
  const body = {
    EmailAddress: "a@example.com",
    Name: "Subscriber One",
    ListJoinedDate: "2021-10-25 10:28:00",
    Date: "2021-10-25 10:28:00",
    State: "Active",
    CustomFields: [],
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await subscriberGet.execute({ listId: "lid", email: "a@example.com" }, ctx);
  assertEquals(pathOf(calls[0].url), `${API_PATH}/subscribers/lid.json`);
  assertEquals(queryOf(calls[0].url), { email: "a@example.com" });
  assertEquals(out, body);
});

/** Off by default, matching the API — the consent value has to be asked for. */
Deno.test("subscriber-get: the tracking-preference flag is omitted unless set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await subscriberGet.execute({ listId: "lid", email: "a@b.com" }, ctx);
  assertEquals(queryOf(calls[0].url).includetrackingpreference, undefined);

  await subscriberGet.execute(
    { listId: "lid", email: "a@b.com", includeTrackingPreference: true },
    ctx,
  );
  assertEquals(queryOf(calls[1].url).includetrackingpreference, "true");
});

/** Date and ListJoinedDate are different facts, and v3.3 added the second. */
Deno.test("subscriber-get: distinguishes state-change date from list-joined date", async () => {
  const { ctx } = mockCtx([{
    body: {
      EmailAddress: "a@b.com",
      State: "Unsubscribed",
      Date: "2026-02-01 09:00:00",
      ListJoinedDate: "2021-10-25 10:28:00",
      CustomFields: [],
      Name: "",
    },
  }]);
  const out = await subscriberGet.execute({ listId: "lid", email: "a@b.com" }, ctx);
  assertEquals(out.State, "Unsubscribed");
  assertEquals(out.Date, "2026-02-01 09:00:00");
  assertEquals(out.ListJoinedDate, "2021-10-25 10:28:00");
});
