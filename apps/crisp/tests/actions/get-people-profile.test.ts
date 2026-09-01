import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import getPeopleProfile from "../../actions/get-people-profile.ts";

Deno.test("get-people-profile: fetches GET /people/profile/{people_id}", async () => {
  const { ctx, calls } = mockCtx([
    { body: { error: false, data: { people_id: "p1", email: "a@b.com" } } },
  ], "site_1");
  const result = await getPeopleProfile.execute({ peopleId: "p1" }, ctx);
  assertEquals(result, { people_id: "p1", email: "a@b.com" });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/website/site_1/people/profile/p1");
});

Deno.test("get-people-profile: also accepts an email in place of the UUID (per Crisp's own docs)", async () => {
  const { ctx, calls } = mockCtx([{ body: { error: false, data: {} } }], "site_1");
  await getPeopleProfile.execute({ peopleId: "a@b.com" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/website/site_1/people/profile/a%40b.com");
});
