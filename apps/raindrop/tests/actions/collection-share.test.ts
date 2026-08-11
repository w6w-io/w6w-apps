import { assert, assertEquals, assertRejects } from "@std/assert";
import collectionShare, { MAX_INVITES } from "../../actions/collection-share.ts";
import { bodyOf, mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("collection-share: POSTs the emails and role to /collection/{id}/sharing", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ emails: ["a@b.com"] }) }]);
  const out = await collectionShare.execute(
    { id: 8492393, emails: "a@b.com", role: "member" },
    ctx,
  ) as { emails: string[]; result: boolean };

  assertEquals(pathOf(calls[0].url), "/rest/v1/collection/8492393/sharing");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { emails: ["a@b.com"], role: "member" });
  assertEquals(out, { emails: ["a@b.com"], result: true });
});

/**
 * The vendor's documented ceiling is 10 ("you cant send more than 10 invites at
 * once"). Enforcing it here means the failure arrives before real invitation
 * emails are attempted, not after.
 */
Deno.test("collection-share: refuses more than 10 addresses without making a request", async () => {
  assertEquals(MAX_INVITES, 10);
  const emails = Array.from({ length: 11 }, (_, i) => `u${i}@example.com`).join(",");
  const { ctx, calls } = mockCtx([]);

  const err = await assertRejects(
    () => Promise.resolve(collectionShare.execute({ id: 1, emails }, ctx)),
    Error,
  );
  assert(err.message.includes("11"), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("collection-share: refuses an empty address list without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(collectionShare.execute({ id: 1, emails: "" }, ctx)),
    Error,
  );
  assertEquals(calls.length, 0);
});

/** It sends email to real people; a replay sends a second invitation. */
Deno.test("collection-share: is not idempotent and says it sends email", () => {
  assertEquals(collectionShare.idempotent, false);
  assert(/email/i.test(collectionShare.description ?? ""), collectionShare.description);
});
