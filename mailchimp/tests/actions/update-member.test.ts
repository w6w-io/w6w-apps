import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-member.ts";
import { subscriberHash } from "../../lib/subscriber-hash.ts";

Deno.test("update-member: PUTs to /lists/{id}/members/{hash}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1" } }]);
  await action.execute!(
    { listId: "abc", email: "u@example.com" },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(
    new URL(calls[0].url).pathname,
    `/3.0/lists/abc/members/${subscriberHash("u@example.com")}`,
  );
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.email_address, "u@example.com");
  assert(!("status" in body));
});

Deno.test("update-member: forwards optionals and skip_merge_validation as a query flag", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      listId: "abc",
      email: "u@example.com",
      status: "subscribed",
      emailType: "text",
      language: "de",
      vip: false,
      mergeFields: { FNAME: "Sam" },
      interests: { xyz: false },
      skipMergeValidation: true,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.status, "subscribed");
  assertEquals(body.email_type, "text");
  assertEquals(body.language, "de");
  assertEquals(body.vip, false);
  assertEquals(body.merge_fields, { FNAME: "Sam" });
  assertEquals(body.interests, { xyz: false });
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("skip_merge_validation"), "true");
});
