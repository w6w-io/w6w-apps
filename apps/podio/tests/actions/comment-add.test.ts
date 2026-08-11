import { assertEquals } from "@std/assert";
import commentAdd from "../../actions/comment-add.ts";
import { bodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const CREATED = { comment_id: 77, granted_users: [] };

Deno.test("comment-add: POSTs the comment to the polymorphic endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  const out = await commentAdd.execute({ refType: "item", refId: "9", value: "hello" }, ctx);
  assertEquals(out, { commentId: 77, grantedUsers: [] });
  assertEquals(pathOf(calls[0].url), "/comment/item/9/");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { value: "hello" });
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("comment-add: optional body fields map to their snake_case names", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  await commentAdd.execute({
    refType: "item",
    refId: "9",
    value: "hi",
    externalId: "note-1",
    embedUrl: "https://example.com/x",
    fileIds: [1],
  }, ctx);
  assertEquals(bodyOf(calls[0]), {
    value: "hi",
    external_id: "note-1",
    embed_url: "https://example.com/x",
    file_ids: [1],
  });
});

/**
 * `alert_invite` lets an @-mention in an automated comment grant someone
 * workspace access. Podio defaults it off, and this app must not quietly
 * default it on.
 */
Deno.test("comment-add: alert_invite is off unless explicitly asked for", async () => {
  const silent = mockCtx([{ body: CREATED }]);
  await commentAdd.execute({ refType: "item", refId: "9", value: "hi" }, silent.ctx);
  assertEquals(queryOf(silent.calls[0].url).alert_invite, undefined);

  const asked = mockCtx([{ body: CREATED }]);
  await commentAdd.execute(
    { refType: "item", refId: "9", value: "hi", alertInvite: true },
    asked.ctx,
  );
  assertEquals(queryOf(asked.calls[0].url).alert_invite, "true");
});

Deno.test("comment-add: the invite parameter warns that it grants access", () => {
  const param = commentAdd.params!.find((p) => p.key === "alertInvite")!;
  assertEquals(param.hint!.includes("workspace access"), true);
  assertEquals(param.default, undefined, "a default here would be this app choosing for the user");
});

/** Podio stores an external id on a comment but does not deduplicate on it. */
Deno.test("comment-add: is declared non-idempotent", () => {
  assertEquals(commentAdd.idempotent, false);
  assertEquals(commentAdd.type, "perform");
});

Deno.test("comment-add: a bodyless response still yields a shaped result", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(
    await commentAdd.execute({ refType: "item", refId: "9", value: "x" }, ctx),
    { commentId: undefined, grantedUsers: [] },
  );
});
