import { assertEquals, assertRejects } from "@std/assert";
import peopleEnrich from "../../actions/people-enrich.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("people-enrich: POSTs to /people/match with filters as query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { person: { id: "p1", name: "Tim Zheng" } } }]);
  const out = await peopleEnrich.execute(
    { email: "tim@apollo.io", reveal_phone_number: true, webhook_url: "https://example.com/hook" },
    ctx,
  ) as { person: { name: string } };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/people/match");
  assertEquals(queryOf(calls[0].url).email, "tim@apollo.io");
  assertEquals(queryOf(calls[0].url).reveal_phone_number, "true");
  assertEquals(queryOf(calls[0].url).webhook_url, "https://example.com/hook");
  assertEquals(calls[0].body, null); // no requestBody — everything is query params
  assertEquals(out.person.name, "Tim Zheng");
});

Deno.test("people-enrich: an unmatched search returns null rather than throwing", async () => {
  const { ctx } = mockCtx([{ body: { person: null } }]);
  const out = await peopleEnrich.execute({ name: "Nobody Findable" }, ctx) as { person: unknown };
  assertEquals(out.person, null);
});

Deno.test("people-enrich: a vendor error propagates with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Invalid API key." }]);
  await assertRejects(
    () => Promise.resolve(peopleEnrich.execute({ email: "a@b.com" }, ctx)),
    Error,
  );
});
