import { assert, assertEquals, assertThrows } from "@std/assert";
import updateCandidate from "../../actions/update-candidate.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("update-candidate: PATCHes only the keys that were filled in", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 9, updated_at: "2026-08-11T00:00:00Z" } }]);
  await updateCandidate.execute({ candidateId: 9, title: "Engineer" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v3/candidates/9");
  assertEquals(bodyOf(calls[0]), { title: "Engineer" });
});

/**
 * `false` is a real value here — turning `can_email` off is the whole point of
 * the field — so it must survive a "was this filled in?" check that a truthiness
 * test would eat.
 */
Deno.test("update-candidate: a false boolean is sent, not dropped as empty", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 9 } }]);
  await updateCandidate.execute({ candidateId: 9, canEmail: false, isPrivate: false }, ctx);
  assertEquals(bodyOf(calls[0]), { can_email: false, is_private: false });
});

/**
 * The dangerous property of this endpoint: the contact and tag fields are
 * whole-collection replacements, so sending one address deletes the others.
 * There is no append, which is why the labels and hints say REPLACE.
 */
Deno.test("update-candidate: the collection fields are labelled as replacements", () => {
  const byKey = Object.fromEntries((updateCandidate.params ?? []).map((p) => [p.key, p]));
  for (const key of ["replaceEmailAddress", "replacePhoneNumber", "replaceTags"]) {
    assert(byKey[key].label.startsWith("Replace"), `${key}: ${byKey[key].label}`);
    assert(/REPLACE/.test(byKey[key].hint ?? ""), `${key}: ${byKey[key].hint}`);
  }
});

Deno.test("update-candidate: a replacement address is sent as a single-item collection", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 9 } }]);
  await updateCandidate.execute({
    candidateId: 9,
    replaceEmailAddress: "new@example.com",
    emailType: "work",
    replaceTags: "alumni, 2026",
  }, ctx);

  assertEquals(bodyOf(calls[0]), {
    email_addresses: [{ value: "new@example.com", type: "work" }],
    tags: ["alumni", "2026"],
  });
});

/** An empty tag string is a deliberate "clear every tag", not a no-op. */
Deno.test("update-candidate: an empty replacement tag list clears the tags", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 9 } }]);
  await updateCandidate.execute({ candidateId: 9, replaceTags: "" }, ctx);
  assertEquals(bodyOf(calls[0]), { tags: [] });
});

Deno.test("update-candidate: an empty patch fails locally rather than spending a request", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(() => updateCandidate.execute({ candidateId: 9 }, ctx), Error, "Nothing to update");
  assertEquals(calls.length, 0);
});

/**
 * A PATCH that touches only the keys present genuinely leaves the same end state
 * when repeated, which is what makes it safe to let the runtime retry.
 */
Deno.test("update-candidate: is the one write honestly declared idempotent", () => {
  assertEquals(updateCandidate.idempotent, true);
});

Deno.test("update-candidate: a pasted path separator cannot escape the id segment", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await updateCandidate.execute(
    { candidateId: "9/../users" as unknown as number, title: "x" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v3/candidates/9%2F..%2Fusers");
});
