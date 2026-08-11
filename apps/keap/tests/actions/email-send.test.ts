import { assert, assertEquals, assertRejects } from "@std/assert";
import emailSend from "../../actions/email-send.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * Keap declares `html_content` as "encoded in Base64" and its example is
 * `PGgxPldlbGNvbWU8L2gxPg==` for `<h1>Welcome</h1>`. Posting raw markup does
 * NOT error — the recipient just gets the literal tags.
 */
Deno.test("email-send: the HTML body is Base64-encoded before it goes on the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 202 }]);
  await emailSend.execute(
    { contactIds: "1,2", subject: "Hi", htmlContent: "<h1>Welcome</h1>", userId: "7" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.html_content, "PGgxPldlbGNvbWU8L2gxPg==");
  assert(!JSON.stringify(body).includes("<h1>"), "raw markup reached the wire");
});

Deno.test("email-send: already-encoded content is not encoded twice", async () => {
  const { ctx, calls } = mockCtx([{ status: 202 }]);
  await emailSend.execute(
    { contactIds: "1", subject: "Hi", htmlContent: "PGgxPldlbGNvbWU8L2gxPg==", userId: "7" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).html_content, "PGgxPldlbGNvbWU8L2gxPg==");
});

Deno.test("email-send: posts to the colon-suffixed custom method with string contact ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 202 }]);
  await emailSend.execute({ contactIds: "1,2,3", subject: "Hi", userId: "7" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/emails:send");
  assertEquals(JSON.parse(calls[0].body!).contacts, ["1", "2", "3"]);
});

/**
 * The only success Keap declares is 202 Accepted with NO content — no message
 * id, nothing to correlate a later delivery against.
 */
Deno.test("email-send: a 202 with no body is the documented success", async () => {
  const { ctx } = mockCtx([{ status: 202 }]);
  const out = await emailSend.execute({ contactIds: "1", subject: "Hi", userId: "7" }, ctx) as {
    status: number;
    queued: boolean;
  };
  assertEquals(out.status, 202);
  assertEquals(out.queued, true);
});

/** "Exactly one of `user_id` or `from_address` is required." */
Deno.test("email-send: neither sender is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await emailSend.execute({ contactIds: "1", subject: "Hi" }, ctx),
    Error,
    "exactly one sender",
  );
  assertEquals(calls.length, 0);
});

Deno.test("email-send: both senders together is also refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await emailSend.execute(
        { contactIds: "1", subject: "Hi", userId: "7", fromAddress: "a@b.com" },
        ctx,
      ),
    Error,
    "exactly one sender",
  );
  assertEquals(calls.length, 0);
});

Deno.test("email-send: an empty recipient list is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await emailSend.execute({ contactIds: " ", subject: "Hi", userId: "7" }, ctx),
    Error,
    "At least one contact ID",
  );
  assertEquals(calls.length, 0);
});

/** "Attachments … maximum of 10 with size of 1MB each." */
Deno.test("email-send: more than ten attachments is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const attachments = Array.from({ length: 11 }, (_, i) => ({
    file_name: `f${i}.pdf`,
    file_data: "AA==",
  }));
  await assertRejects(
    async () =>
      await emailSend.execute({ contactIds: "1", subject: "Hi", userId: "7", attachments }, ctx),
    Error,
    "at most 10 attachments",
  );
  assertEquals(calls.length, 0);
});

Deno.test("email-send: is declared non-idempotent — a retry sends the mail twice", () => {
  assertEquals(emailSend.idempotent, false);
});
