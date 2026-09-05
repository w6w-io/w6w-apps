import type { AppDefinition } from "@w6w/types";
import getLead from "./actions/get-lead.ts";
import getLeadFields from "./actions/get-lead-fields.ts";
import getPageLead from "./actions/get-page-lead.ts";
import downloadPageLeads from "./actions/download-page-leads.ts";
import accessToken from "./auth/access-token.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [getLead, getLeadFields, getPageLead, downloadPageLeads],
  auth: [accessToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
