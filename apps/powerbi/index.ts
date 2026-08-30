import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

// workspace
import listWorkspaces from "./actions/list-workspaces.ts";
import createWorkspace from "./actions/create-workspace.ts";
import deleteWorkspace from "./actions/delete-workspace.ts";
import listWorkspaceUsers from "./actions/list-workspace-users.ts";
import addWorkspaceUser from "./actions/add-workspace-user.ts";

// report
import listReports from "./actions/list-reports.ts";
import getReport from "./actions/get-report.ts";
import deleteReport from "./actions/delete-report.ts";
import exportReportToFile from "./actions/export-report-to-file.ts";
import getExportStatus from "./actions/get-export-status.ts";
import getExportFile from "./actions/get-export-file.ts";

// dataset
import listDatasets from "./actions/list-datasets.ts";
import getDataset from "./actions/get-dataset.ts";
import refreshDataset from "./actions/refresh-dataset.ts";
import listRefreshHistory from "./actions/list-refresh-history.ts";
import executeDatasetQueries from "./actions/execute-dataset-queries.ts";

// dashboard
import listDashboards from "./actions/list-dashboards.ts";
import listDashboardTiles from "./actions/list-dashboard-tiles.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    listWorkspaces,
    createWorkspace,
    deleteWorkspace,
    listWorkspaceUsers,
    addWorkspaceUser,
    listReports,
    getReport,
    deleteReport,
    exportReportToFile,
    getExportStatus,
    getExportFile,
    listDatasets,
    getDataset,
    refreshDataset,
    listRefreshHistory,
    executeDatasetQueries,
    listDashboards,
    listDashboardTiles,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
