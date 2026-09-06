import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import singleCheck from "./actions/single-check.ts";
import jobsCreate from "./actions/jobs-create.ts";
import jobsParse from "./actions/jobs-parse.ts";
import jobsStart from "./actions/jobs-start.ts";
import jobsStatus from "./actions/jobs-status.ts";
import jobsResults from "./actions/jobs-results.ts";
import jobsDownload from "./actions/jobs-download.ts";
import jobsDelete from "./actions/jobs-delete.ts";
import jobsSearch from "./actions/jobs-search.ts";
import accountInfo from "./actions/account-info.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    singleCheck,
    jobsCreate,
    jobsParse,
    jobsStart,
    jobsStatus,
    jobsResults,
    jobsDownload,
    jobsDelete,
    jobsSearch,
    accountInfo,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
