import type { ActionDefinition } from "@w6w/types";
import { WebinarGeekClient, type WebinarGeekPages } from "../lib/client.ts";
import { orderSortParams, paginationParams, scopeFilterParams } from "../lib/params.ts";

/**
 * `GET /subscriptions` — subscribers to a broadcast, episode, webinar, or the whole account.
 *
 * Never returns subscribers still pending email verification, when that is enabled for the
 * webinar — a filtered-out subscriber is not a bug in this action.
 *
 * `watchEndFrom`/`watchEndTo` are the one pair of filters on this endpoint that take an ISO-8601
 * string rather than a Unix timestamp (see `lib/client.ts`'s module doc), and both must be
 * supplied together — passing only one is a documented no-op on WebinarGeek's side, not an error.
 */
interface Input {
  email?: string;
  externalId?: string;
  watchedWebinar?: boolean;
  watchedReplay?: boolean;
  watchedLive?: boolean;
  viewerStartedWatching?: boolean;
  broadcastEnded?: boolean;
  unsubscribed?: boolean;
  assessmentPassed?: boolean;
  webinarId?: number;
  episodeId?: number;
  broadcastId?: number;
  watchEndFrom?: string;
  watchEndTo?: string;
  nestedResources?: string;
  order?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}

const subscriptionList: ActionDefinition<Input> = {
  key: "subscription-list",
  type: "search",
  resource: "subscription",
  title: "List Subscriptions",
  description:
    "List subscribers to a broadcast, episode, webinar, or the whole account, with filters.",
  params: [
    { key: "email", label: "Email", type: "string", hint: "Filter by exact email address." },
    { key: "externalId", label: "External ID", type: "string" },
    ...scopeFilterParams(),
    { key: "watchedWebinar", label: "Watched the webinar", type: "boolean", advanced: true },
    { key: "watchedReplay", label: "Watched the replay", type: "boolean", advanced: true },
    { key: "watchedLive", label: "Watched live", type: "boolean", advanced: true },
    {
      key: "viewerStartedWatching",
      label: "Started watching",
      type: "boolean",
      advanced: true,
    },
    { key: "broadcastEnded", label: "Broadcast has ended", type: "boolean", advanced: true },
    { key: "unsubscribed", label: "Unsubscribed only", type: "boolean", advanced: true },
    {
      key: "assessmentPassed",
      label: "Assessment passed only",
      type: "boolean",
      advanced: true,
    },
    {
      key: "watchEndFrom",
      label: "Watch end from",
      type: "datetime",
      advanced: true,
      hint: "ISO-8601 UTC. Must be used together with Watch end to. Only matches subscriptions " +
        "with a non-null watch_end.",
    },
    {
      key: "watchEndTo",
      label: "Watch end to",
      type: "datetime",
      advanced: true,
      hint: "ISO-8601 UTC. Must be used together with Watch end from.",
    },
    {
      key: "nestedResources",
      label: "Include nested resources",
      type: "select",
      advanced: true,
      options: [
        { value: "broadcast", label: "Broadcast" },
        { value: "episode", label: "Episode" },
        { value: "webinar", label: "Webinar" },
      ],
    },
    ...orderSortParams(
      [
        { value: "created_at", label: "Created at" },
        { value: "unsubscribed_at", label: "Unsubscribed at" },
        { value: "watched_true_set_at", label: "First watched at" },
        { value: "watch_end", label: "Watch end" },
      ],
      "created_at",
    ),
    ...paginationParams(),
  ],
  output: [
    { key: "subscriptions", type: "array", label: "Subscriptions" },
    { key: "totalCount", type: "number", label: "Total matching subscriptions" },
    { key: "page", type: "number", label: "Current page" },
    { key: "perPage", type: "number", label: "Results per page" },
    { key: "totalPages", type: "number", label: "Total pages" },
  ],

  async execute(input, ctx) {
    const body = await new WebinarGeekClient(ctx).request<
      { total_count?: number; subscriptions?: unknown[]; pages?: WebinarGeekPages }
    >("/subscriptions", {
      query: {
        email: input.email,
        external_id: input.externalId,
        watched_webinar: input.watchedWebinar,
        watched_replay: input.watchedReplay,
        watched_live: input.watchedLive,
        viewer_started_watching: input.viewerStartedWatching,
        broadcast_ended: input.broadcastEnded,
        unsubscribed: input.unsubscribed,
        assessment_passed: input.assessmentPassed,
        webinar_id: input.webinarId,
        episode_id: input.episodeId,
        broadcast_id: input.broadcastId,
        watch_end_from: input.watchEndFrom,
        watch_end_to: input.watchEndTo,
        nested_resources: input.nestedResources,
        order: input.order,
        sort: input.sort,
        page: input.page,
        per_page: input.perPage,
      },
    });
    return {
      subscriptions: body?.subscriptions ?? [],
      totalCount: body?.total_count ?? 0,
      page: body?.pages?.page,
      perPage: body?.pages?.per_page,
      totalPages: body?.pages?.total_pages,
    };
  },
};

export default subscriptionList;
