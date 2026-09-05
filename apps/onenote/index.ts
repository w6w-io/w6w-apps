import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

// notebook
import listNotebooks from "./actions/list-notebooks.ts";
import getNotebook from "./actions/get-notebook.ts";
import createNotebook from "./actions/create-notebook.ts";

// section
import listSections from "./actions/list-sections.ts";
import getSection from "./actions/get-section.ts";
import createSection from "./actions/create-section.ts";

// section group
import listSectionGroups from "./actions/list-section-groups.ts";
import getSectionGroup from "./actions/get-section-group.ts";
import createSectionGroup from "./actions/create-section-group.ts";

// page
import listPages from "./actions/list-pages.ts";
import getPage from "./actions/get-page.ts";
import getPageContent from "./actions/get-page-content.ts";
import createPage from "./actions/create-page.ts";
import updatePageContent from "./actions/update-page-content.ts";
import deletePage from "./actions/delete-page.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    listNotebooks,
    getNotebook,
    createNotebook,
    listSections,
    getSection,
    createSection,
    listSectionGroups,
    getSectionGroup,
    createSectionGroup,
    listPages,
    getPage,
    getPageContent,
    createPage,
    updatePageContent,
    deletePage,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
