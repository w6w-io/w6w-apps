import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import updatePeopleProfile from "../../actions/update-people-profile.ts";

Deno.test("update-people-profile: PATCHes only the fields set", async () => {
  const { ctx, calls } = mockCtx([
    { body: { error: false, reason: "updated", data: {} } },
  ], "site_1");
  const result = await updatePeopleProfile.execute({
    peopleId: "p1",
    nickname: "New Name",
  }, ctx);
  assertEquals(result, {});
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { person: { nickname: "New Name" } });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/website/site_1/people/profile/p1");
});

Deno.test("update-people-profile: omits the person object entirely when no person field is set", async () => {
  const { ctx, calls } = mockCtx([{ body: { error: false, data: {} } }], "site_1");
  await updatePeopleProfile.execute({ peopleId: "p1", email: "new@b.com" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { email: "new@b.com" });
});

Deno.test("update-people-profile: marked idempotent — repeating the same patch converges", () => {
  assertEquals(updatePeopleProfile.idempotent, true);
});
