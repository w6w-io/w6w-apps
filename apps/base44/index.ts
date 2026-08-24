import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import getAnalytics from "./actions/get-analytics.ts";
import listUsers from "./actions/list-users.ts";
import getUser from "./actions/get-user.ts";
import listUserApps from "./actions/list-user-apps.ts";
import listUserSuperagents from "./actions/list-user-superagents.ts";
import listApps from "./actions/list-apps.ts";
import getAppAnalytics from "./actions/get-app-analytics.ts";
import listSuperagents from "./actions/list-superagents.ts";
import getSuperagentAnalytics from "./actions/get-superagent-analytics.ts";
import listAuditLogs from "./actions/list-audit-logs.ts";
import getSecurityScanFindings from "./actions/get-security-scan-findings.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";

export default {
  actions: [
    // analytics
    getAnalytics,
    // users
    listUsers,
    getUser,
    listUserApps,
    listUserSuperagents,
    // apps
    listApps,
    getAppAnalytics,
    // superagents
    listSuperagents,
    getSuperagentAnalytics,
    // audit logs / security
    listAuditLogs,
    getSecurityScanFindings,
  ],
  auth: [apiKey],
  healthChecks: [service, api],
} satisfies AppDefinition;
