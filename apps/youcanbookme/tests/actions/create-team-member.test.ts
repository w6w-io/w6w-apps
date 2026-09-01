import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-team-member.ts";

Deno.test("create-team-member: POSTs /{accountId}/profiles/{profileId}/teammembers/items", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "tm-1" } }]);
  await action.execute(
    {
      accountId: "acc-1",
      profileId: "prof-1",
      name: "Jane Doe",
      email: "jane@example.com",
      description: "Sales",
      calendarId: "cal-1",
      order: "2",
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/acc-1/profiles/prof-1/teammembers/items");
  assertEquals(url.searchParams.get("order"), "2");
  assertEquals(
    JSON.parse(calls[0].body!),
    { name: "Jane Doe", email: "jane@example.com", description: "Sales", calendarId: "cal-1" },
  );
});

Deno.test("create-team-member: defaults response fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "tm-1" } }]);
  await action.execute({ accountId: "acc-1", profileId: "prof-1", name: "Jane Doe" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.searchParams.get("fields"),
    "id,name,description,pic,calendarId,targetCalendarTitle,targetCalendatTimeZone",
  );
});
