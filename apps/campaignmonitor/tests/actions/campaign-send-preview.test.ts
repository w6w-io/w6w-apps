import { assert, assertEquals, assertRejects } from "@std/assert";
import campaignSendPreview, {
  MAX_PREVIEW_RECIPIENTS,
} from "../../actions/campaign-send-preview.ts";
import { API_PATH, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-send-preview: POSTs the recipients under PreviewRecipients", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await campaignSendPreview.execute(
    { campaignId: "cmp", previewRecipients: ["a@example.com", "b@example.com"] },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `${API_PATH}/campaigns/cmp/sendpreview.json`);
  assertEquals(bodyOf(calls[0]), { PreviewRecipients: ["a@example.com", "b@example.com"] });
  assertEquals(out, { recipients: 2 });
});

Deno.test("campaign-send-preview: refuses more than the documented 15", async () => {
  const { ctx, calls } = mockCtx([]);
  const tooMany = Array.from(
    { length: MAX_PREVIEW_RECIPIENTS + 1 },
    (_, i) => `p${i}@example.com`,
  );
  await assertRejects(
    async () =>
      await campaignSendPreview.execute({ campaignId: "cmp", previewRecipients: tooMany }, ctx),
    Error,
    "at most 15 preview recipients",
  );
  assertEquals(calls.length, 0);
});

Deno.test("campaign-send-preview: refuses an empty list, which the API answers with 370", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await campaignSendPreview.execute({ campaignId: "cmp", previewRecipients: [] }, ctx),
    Error,
    "370",
  );
  assertEquals(calls.length, 0);
});

/** Every call delivers mail and burns a rationed daily allowance. */
Deno.test("campaign-send-preview: is declared NOT idempotent", () => {
  assertEquals(campaignSendPreview.idempotent, false);
});

/** The vendor documents Personalize as ignored, so it must not be offered. */
Deno.test("campaign-send-preview: does not expose the deprecated Personalize parameter", () => {
  const keys = (campaignSendPreview.params ?? []).map((p) => p.key.toLowerCase());
  assert(!keys.includes("personalize"), "Personalize is deprecated and ignored by the vendor");
});
