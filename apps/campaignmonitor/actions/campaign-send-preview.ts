import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { asJson, campaignIdParam } from "../lib/params.ts";

/**
 * `POST /api/v3.3/campaigns/{campaignid}/sendpreview.json` — send a test copy of
 * a draft. **Campaign-level.**
 *
 * `idempotent: false`: every call actually delivers mail and consumes a strictly
 * rationed allowance — **15 recipients per call** (code 374) and **240 addresses
 * per 1440 minutes** across the client (code 375), on top of a per-customer cap
 * on test campaigns (code 333). A retried preview burns that budget for the day.
 *
 * Personalization is **not** rendered with real subscriber data: "Any
 * personalization tags in your draft campaign will be populated using fallback
 * values." The `Personalize` parameter that used to control this is documented
 * as deprecated — "All values passed to this field will be ignored" — so it is
 * not exposed.
 *
 * A rejected address list comes back as code 371 with a `ResultData` array
 * naming each bad address; the client surfaces that payload verbatim.
 */
interface Input {
  campaignId: string;
  previewRecipients: unknown;
}

/** Documented ceiling, checked before the request so the error names the cause. */
export const MAX_PREVIEW_RECIPIENTS = 15;

const campaignSendPreview: ActionDefinition<Input, { recipients: number }> = {
  key: "campaign-send-preview",
  type: "perform",
  resource: "campaign",
  title: "Send Campaign Preview",
  description:
    "Send a test copy of a draft campaign to up to 15 addresses. Personalization uses fallback " +
    "values, not real subscriber data. Rationed: 240 addresses per 24 hours per client.",
  idempotent: false,
  params: [
    campaignIdParam,
    {
      key: "previewRecipients",
      label: "Preview recipients",
      type: "json",
      required: true,
      hint:
        'JSON array of up to 15 email addresses, e.g. ["a@example.com"]. Invalid addresses come ' +
        "back as code 371 with each offender named.",
    },
  ],
  output: [{ key: "recipients", type: "number", label: "Addresses the preview was sent to" }],

  async execute(input, ctx) {
    const recipients = asJson<string[]>(input.previewRecipients, "Preview recipients");
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new Error("Preview recipients must be a non-empty JSON array (the API answers 370).");
    }
    if (recipients.length > MAX_PREVIEW_RECIPIENTS) {
      throw new Error(
        `Campaign Monitor allows at most ${MAX_PREVIEW_RECIPIENTS} preview recipients per call; ` +
          `got ${recipients.length}.`,
      );
    }
    await new CampaignMonitorClient(ctx).json(
      `/campaigns/${encodeId(input.campaignId)}/sendpreview`,
      { method: "POST", body: { PreviewRecipients: recipients } },
    );
    return { recipients: recipients.length };
  },
};

export default campaignSendPreview;
