import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId, type PagedResult } from "../lib/client.ts";
import { campaignIdParam, orderDirectionParam, pagedOutput, pageParams } from "../lib/params.ts";

/**
 * The five campaign interaction reports, behind one action. **Campaign-level.**
 *
 *     GET /api/v3.3/campaigns/{campaignid}/opens.json
 *                                          /clicks.json
 *                                          /bounces.json
 *                                          /unsubscribes.json
 *                                          /spam.json
 *
 * One action because the vendor gives all five the same signature — `date`,
 * `page`, `pagesize`, `orderfield={email|list|date}`, `orderdirection` — the
 * same `PagedResult` envelope, and a common record core of `{EmailAddress,
 * ListID, Date}`. What differs is one extra field each, kept in the output
 * documentation rather than in five near-identical files:
 *
 *  - **opens** — `IPAddress`, `Latitude`/`Longitude`, `City`, `Region`,
 *    `CountryCode`, `CountryName` (the data behind the Worldview report).
 *  - **clicks** — the same geo fields plus `URL`, the link that was clicked.
 *  - **bounces** — `BounceType` (`Hard` / `Soft`) and `Reason`.
 *  - **unsubscribes** — `IPAddress`.
 *  - **spam** — `EmailAddress`, `ListID` and `Date` only.
 *
 * ## The `date` parameter has minute precision here
 *
 * `YYYY-MM-DD HH:MM`, not the bare `YYYY-MM-DD` that the list and suppression
 * endpoints take. It is a *since* filter — "records after this date" — in the
 * client's timezone, which makes it the right way to poll a campaign
 * incrementally: keep the newest `Date` you saw and pass it back next time.
 *
 * Note this is only ever a *sent* campaign's data; a draft has none.
 */
interface Input {
  campaignId: string;
  event?: string;
  date?: string;
  page?: number;
  pageSize?: number;
  orderField?: string;
  orderDirection?: string;
}

interface Interaction {
  EmailAddress: string;
  ListID: string;
  Date: string;
  IPAddress?: string;
  URL?: string;
  BounceType?: string;
  Reason?: string;
}

/** The five documented report paths. */
export const CAMPAIGN_EVENTS = [
  "opens",
  "clicks",
  "bounces",
  "unsubscribes",
  "spam",
] as const;

const campaignInteractionsGet: ActionDefinition<Input, PagedResult<Interaction>> = {
  key: "campaign-interactions-get",
  type: "search",
  resource: "campaign",
  title: "Get Campaign Interactions",
  description:
    "Read a page of a sent campaign's opens, clicks, bounces, unsubscribes or spam complaints, " +
    "optionally only those recorded since a given minute.",
  params: [
    campaignIdParam,
    {
      key: "event",
      label: "Report",
      type: "select",
      required: true,
      default: "opens",
      options: [
        { value: "opens", label: "Opens — with IP address and geolocation" },
        { value: "clicks", label: "Clicks — with the clicked URL and geolocation" },
        { value: "bounces", label: "Bounces — with bounce type (Hard/Soft) and reason" },
        { value: "unsubscribes", label: "Unsubscribes — with IP address" },
        { value: "spam", label: "Spam complaints" },
      ],
    },
    {
      key: "date",
      label: "Recorded on or after",
      type: "string",
      placeholder: "2026-01-31 09:30",
      hint: "YYYY-MM-DD HH:MM (minute precision, unlike the list endpoints), in the client's " +
        "timezone. Pass back the newest Date you saw to poll incrementally.",
    },
    ...pageParams(100),
    {
      key: "orderField",
      label: "Order by",
      type: "select",
      options: [
        { value: "email", label: "Email address" },
        { value: "list", label: "List" },
        { value: "date", label: "Date" },
      ],
    },
    orderDirectionParam,
  ],
  output: pagedOutput,

  execute(input, ctx) {
    const event = (input.event ?? "opens").toLowerCase();
    if (!(CAMPAIGN_EVENTS as readonly string[]).includes(event)) {
      // Guarded rather than passed through: an unknown segment would build a
      // path this API answers with a 401, which reads like a rejected key.
      throw new Error(`Report must be one of: ${CAMPAIGN_EVENTS.join(", ")}`);
    }
    return new CampaignMonitorClient(ctx).json<PagedResult<Interaction>>(
      `/campaigns/${encodeId(input.campaignId)}/${event}`,
      {
        query: {
          date: input.date,
          page: input.page,
          pagesize: input.pageSize,
          orderfield: input.orderField,
          orderdirection: input.orderDirection,
        },
      },
    );
  },
};

export default campaignInteractionsGet;
