import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import createPeopleProfile from "../../actions/create-people-profile.ts";

Deno.test("create-people-profile: POSTs email + person.nickname, returns the new people_id", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { error: false, reason: "added", data: { people_id: "c5a2f70c" } } },
  ], "site_1");
  const result = await createPeopleProfile.execute({
    email: "valerian@crisp.chat",
    nickname: "Valerian Saliou",
  }, ctx);
  assertEquals(result, { people_id: "c5a2f70c" });
  assertEquals(JSON.parse(calls[0].body!), {
    email: "valerian@crisp.chat",
    person: { nickname: "Valerian Saliou" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/website/site_1/people/profile");
});

Deno.test("create-people-profile: nests companyName under company.name, splits segments", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { error: false, data: { people_id: "p1" } } },
  ], "site_1");
  await createPeopleProfile.execute({
    email: "a@b.com",
    nickname: "A B",
    companyName: "Acme Inc",
    segments: "lead, newsletter",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.company, { name: "Acme Inc" });
  assertEquals(body.segments, ["lead", "newsletter"]);
});

Deno.test("create-people-profile: perform, not idempotent — a duplicate email 409s rather than upserting", () => {
  assertEquals(createPeopleProfile.idempotent, false);
});
