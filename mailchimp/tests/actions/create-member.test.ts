import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-member.ts";

Deno.test("create-member: POSTs to /lists/{id}/members with required fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1" } }]);
  await action.execute!(
    { listId: "abc", email: "u@example.com", status: "subscribed" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/3.0/lists/abc/members");
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.email_address, "u@example.com");
  assertEquals(body.status, "subscribed");
});

Deno.test("create-member: forwards all optional fields, snake-casing where needed", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1" } }]);
  await action.execute!(
    {
      listId: "abc",
      email: "u@example.com",
      status: "pending",
      emailType: "html",
      language: "en",
      vip: true,
      ipSignup: "1.2.3.4",
      ipOptIn: "5.6.7.8",
      timestampSignup: "2026-01-01T00:00:00Z",
      timestampOpt: "2026-02-02T00:00:00Z",
      tags: ["a", "b"],
      location: { latitude: 1, longitude: 2 },
      mergeFields: { FNAME: "Sam" },
      interests: { xyz: true },
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.email_type, "html");
  assertEquals(body.language, "en");
  assertEquals(body.vip, true);
  assertEquals(body.ip_signup, "1.2.3.4");
  assertEquals(body.ip_opt, "5.6.7.8");
  assertEquals(body.timestamp_signup, "2026-01-01T00:00:00Z");
  assertEquals(body.timestamp_opt, "2026-02-02T00:00:00Z");
  assertEquals(body.tags, ["a", "b"]);
  assertEquals(body.location, { latitude: 1, longitude: 2 });
  assertEquals(body.merge_fields, { FNAME: "Sam" });
  assertEquals(body.interests, { xyz: true });
});

Deno.test("create-member: omits unspecified optionals from the body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { listId: "abc", email: "u@example.com", status: "subscribed" },
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals("email_type" in body, false);
  assertEquals("tags" in body, false);
  assertEquals("location" in body, false);
  assertEquals("merge_fields" in body, false);
});
