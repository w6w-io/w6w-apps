/**
 * Pendo — track events, read back product analytics data, set metadata,
 * run aggregation queries, and process GDPR/CCPA erasure requests.
 *
 * `lib/client.ts` has the shape of it: two credentials (Integration Key vs.
 * Track Event Shared Secret) sharing one header name, five regional
 * deployments, and an Aggregation query language that is not a bulk export
 * tool.
 */
import type { AppDefinition } from "@w6w/types";

import integrationKey from "./auth/integration-key.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

import trackEvent from "./actions/track-event.ts";
import listPages from "./actions/list-pages.ts";
import listFeatures from "./actions/list-features.ts";
import getVisitor from "./actions/get-visitor.ts";
import getAccount from "./actions/get-account.ts";
import setMetadataValue from "./actions/set-metadata-value.ts";
import getMetadataValue from "./actions/get-metadata-value.ts";
import listGuides from "./actions/list-guides.ts";
import reportResults from "./actions/report-results.ts";
import runAggregation from "./actions/run-aggregation.ts";
import bulkDelete from "./actions/bulk-delete.ts";

const app: AppDefinition = {
  actions: [
    trackEvent,
    listPages,
    listFeatures,
    getVisitor,
    getAccount,
    setMetadataValue,
    getMetadataValue,
    listGuides,
    reportResults,
    runAggregation,
    bulkDelete,
  ],
  auth: [integrationKey],
  healthChecks: [service, quota],
};

export default app;
