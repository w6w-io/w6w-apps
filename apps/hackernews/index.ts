import type { AppDefinition } from "@w6w/types";

import getItem from "./actions/get-item.ts";
import getUser from "./actions/get-user.ts";
import getMaxItemId from "./actions/get-max-item-id.ts";
import listTopStories from "./actions/list-top-stories.ts";
import listNewStories from "./actions/list-new-stories.ts";
import listBestStories from "./actions/list-best-stories.ts";
import listAskStories from "./actions/list-ask-stories.ts";
import listShowStories from "./actions/list-show-stories.ts";
import listJobStories from "./actions/list-job-stories.ts";
import getUpdates from "./actions/get-updates.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

// Hacker News's v0 API is a genuinely no-auth service — no API key, no OAuth,
// no account, and the README states "there is currently no rate limit". `auth`
// is omitted entirely, per "omit for a no-auth app" in docs/build-a-w6w-app.md.
export default {
  actions: [
    // item / user reads
    getItem,
    getUser,
    getMaxItemId,
    // story-id lists
    listTopStories,
    listNewStories,
    listBestStories,
    listAskStories,
    listShowStories,
    listJobStories,
    // changefeed
    getUpdates,
  ],
  healthChecks: [service, quota],
} satisfies AppDefinition;
