import { assert, assertEquals, assertRejects } from "@std/assert";
import campaignSend from "../../actions/campaign-send.ts";
import { API_PATH, bodyOf, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-send: POSTs to /campaigns/{campaignid}/send.json", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await campaignSend.execute(
    { campaignId: "cmp", confirmationEmail: "ops@example.com" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `${API_PATH}/campaigns/cmp/send.json`);
  assertEquals(out, { CampaignID: "cmp", SendDate: "Immediately" });
});

/** The literal word, not an empty field, is what makes it send now. */
Deno.test("campaign-send: defaults SendDate to the literal Immediately", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }, { status: 200 }]);
  await campaignSend.execute({ campaignId: "cmp", confirmationEmail: "o@e.com" }, ctx);
  assertEquals(bodyOf(calls[0]).SendDate, "Immediately");

  await campaignSend.execute(
    { campaignId: "cmp", confirmationEmail: "o@e.com", sendDate: "" },
    ctx,
  );
  assertEquals(bodyOf(calls[1]).SendDate, "Immediately");
});

Deno.test("campaign-send: passes a scheduled date through verbatim", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await campaignSend.execute({
    campaignId: "cmp",
    confirmationEmail: "ops@example.com,ops2@example.com",
    sendDate: "2026-09-01 09:30",
  }, ctx);
  assertEquals(bodyOf(calls[0]), {
    ConfirmationEmail: "ops@example.com,ops2@example.com",
    SendDate: "2026-09-01 09:30",
  });
  assertEquals(out.SendDate, "2026-09-01 09:30");
});

/**
 * The most consequential declaration in this app: Campaign Monitor accepts no
 * idempotency key, so the runtime must never retry a paid, irreversible send.
 */
Deno.test("campaign-send: is declared NOT idempotent", () => {
  assertEquals(campaignSend.idempotent, false);
});

Deno.test("campaign-send: surfaces the already-sent code rather than a bare 400", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody(331, "Campaign has already been sent"),
  }]);
  const err = await assertRejects(
    async () =>
      await campaignSend.execute({ campaignId: "cmp", confirmationEmail: "o@e.com" }, ctx),
    Error,
  );
  assert(err.message.includes("code 331"), err.message);
  assert(err.message.includes("already been sent"), err.message);
});
