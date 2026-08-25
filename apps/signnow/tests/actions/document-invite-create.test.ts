import { assertEquals } from "@std/assert";
import documentInviteCreate from "../../actions/document-invite-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-invite-create: free-form invite sends `to` as a plain email string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "success" } }]);
  await documentInviteCreate.execute(
    { documentId: "doc-1", to: "signer@example.com", from: "sender@example.com" },
    ctx,
  );
  assertEquals(pathOf(calls[0]), "/document/doc-1/invite");
  assertEquals(bodyOf(calls[0]), { to: "signer@example.com", from: "sender@example.com" });
});

Deno.test("document-invite-create: a `[`-prefixed value sends `to` as a parsed recipient array (role-based)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "success" } }]);
  const to = JSON.stringify([{ email: "signer@example.com", role_id: "r-1", role: "Signer 1" }]);
  await documentInviteCreate.execute({ documentId: "doc-1", to }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.to, [{ email: "signer@example.com", role_id: "r-1", role: "Signer 1" }]);
});

Deno.test("document-invite-create: rejects a `[`-prefixed value that isn't a JSON array", () => {
  const { ctx } = mockCtx([]);
  let threw = false;
  try {
    documentInviteCreate.execute({ documentId: "doc-1", to: "[not json" }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("document-invite-create: splits comma-separated CC addresses", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "success" } }]);
  await documentInviteCreate.execute(
    { documentId: "doc-1", to: "signer@example.com", cc: "a@x.com, b@x.com" },
    ctx,
  );
  const body = bodyOf(calls[0]);
  assertEquals(body.cc, ["a@x.com", "b@x.com"]);
});

Deno.test("document-invite-create: is declared not idempotent", () => {
  assertEquals(documentInviteCreate.idempotent, false);
});
