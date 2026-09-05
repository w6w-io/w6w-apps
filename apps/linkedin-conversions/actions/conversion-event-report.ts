import type { ActionDefinition } from "@w6w/types";
import { asJson, LinkedInConversionsClient, llaPartnerConversionUrn } from "../lib/client.ts";

interface ConversionEventUserId {
  idType: string;
  idValue: string;
}

interface ConversionEventUserInfo {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  title?: string;
  countryCode?: string;
}

interface ConversionEventUser {
  userIds: ConversionEventUserId[];
  userInfo?: ConversionEventUserInfo;
  lead?: string;
  externalIds?: string[];
}

/** One conversion event, matching the vendor's Streaming Conversion Events API Schema verbatim. */
interface ConversionEventItem {
  /** Defaults to `conversionId` below when omitted. Bare id or full URN, either is accepted. */
  conversion?: string;
  conversionHappenedAt: number;
  conversionValue?: { currencyCode: string; amount: string };
  eventId?: string;
  user: ConversionEventUser;
}

interface Input {
  conversionId?: string;
  events: unknown;
}

/**
 * `POST /rest/conversionEvents` — streams one or more conversion events to
 * LinkedIn against a Conversion Rule created previously.
 *
 * `events` is accepted as free-form JSON (an array, one object per event)
 * rather than a generated form: `ConversionEventUser` alone has 4 optional
 * sub-shapes (`userIds[]`, `userInfo`, `lead`, `externalIds`) that combine in
 * vendor-specific ways ("if you include userInfo/externalIds/lead without
 * any valid idType in userIds, you must use an empty list [] for userIds"),
 * mirroring why `linkedin-ads`'s `campaign-create` leaves `targetingCriteria`
 * as free-form JSON rather than modeling it as generated Params. LinkedIn's
 * own **Payload Builder** tool exists precisely because this shape is best
 * assembled once and pasted in, not hand-built per field in a form.
 *
 * A **single** event is sent with the vendor's flat single-event body; **two
 * or more** are sent with `X-RestLi-Method: BATCH_CREATE` and the
 * `{ elements: [...] }` wrapper — the two different documented shapes for
 * "one event" vs "a batch," picked automatically from `events.length` so a
 * caller doesn't have to know which form to build. LinkedIn allows up to
 * 5,000 events per batch request; this action does not chunk a larger array
 * for the caller.
 *
 * Any event missing its own `conversion` field falls back to the action's
 * top-level `conversionId` — convenient for the common case of reporting
 * many events against one rule, while still letting a mixed batch target
 * different rules per event.
 *
 * Not marked idempotent: `eventId` is documented as "used for deduplication"
 * but is optional, so a retry that omits it (or is retried under a fresh
 * one) reports a second event. Set `eventId` to a stable value per source
 * event to get LinkedIn's own dedupe on retry.
 */
const conversionEventReport: ActionDefinition<Input> = {
  key: "conversion-event-report",
  type: "perform",
  resource: "conversion-event",
  title: "Report Conversion Event(s)",
  description: "Stream one or more conversion events to a Conversion Rule. Send a JSON array " +
    "with one or more events; a single event uses the plain create shape, two or more use a " +
    "batch create (up to 5,000 per call).",
  idempotent: false,
  params: [
    {
      key: "conversionId",
      label: "Conversion Rule ID",
      type: "string",
      hint: "Default conversion rule for any event below that doesn't set its own 'conversion' " +
        "field. Bare numeric id or full urn:lla:llaPartnerConversion:{id}.",
    },
    {
      key: "events",
      label: "Events",
      type: "json",
      required: true,
      hint: "A JSON array of conversion events (conversionHappenedAt epoch-ms, user.userIds, " +
        "optional conversionValue/eventId/conversion). See the vendor's Payload Builder or this " +
        "app's README for the exact shape.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Accepted" },
    { key: "batch", type: "boolean", label: "Sent as a batch (2+ events)" },
    { key: "count", type: "number", label: "Number of events sent" },
  ],

  async execute(input, ctx) {
    const events = asJson<ConversionEventItem[]>(input.events, "events");
    if (!Array.isArray(events) || events.length === 0) {
      throw new Error("events must be a non-empty JSON array");
    }

    const defaultConversion = input.conversionId
      ? llaPartnerConversionUrn(input.conversionId)
      : undefined;
    const elements = events.map((event) => {
      const conversion = event.conversion
        ? llaPartnerConversionUrn(event.conversion)
        : defaultConversion;
      if (!conversion) {
        throw new Error(
          "each event needs a 'conversion' field, or set the action's Conversion Rule ID",
        );
      }
      return { ...event, conversion };
    });

    const client = new LinkedInConversionsClient(ctx);
    if (elements.length === 1) {
      await client.request("/rest/conversionEvents", { method: "POST", body: elements[0] });
    } else {
      await client.request("/rest/conversionEvents", {
        method: "POST",
        restliMethod: "BATCH_CREATE",
        body: { elements },
      });
    }
    return { ok: true, batch: elements.length > 1, count: elements.length };
  },
};

export default conversionEventReport;
