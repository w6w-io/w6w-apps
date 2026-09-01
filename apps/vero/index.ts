import type { AppDefinition } from "@w6w/types";
import identify from "./actions/identify.ts";
import track from "./actions/track.ts";
import editTags from "./actions/edit-tags.ts";
import alias from "./actions/alias.ts";
import del from "./actions/delete.ts";
import resubscribe from "./actions/resubscribe.ts";
import unsubscribe from "./actions/unsubscribe.ts";
import apiKey from "./auth/api-key.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [identify, track, editTags, alias, del, resubscribe, unsubscribe],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
