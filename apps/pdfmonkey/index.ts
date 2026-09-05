import type { AppDefinition } from "@w6w/types";
import bearerToken from "./auth/bearer-token.ts";
import createDocument from "./actions/create-document.ts";
import createDocumentSync from "./actions/create-document-sync.ts";
import getDocument from "./actions/get-document.ts";
import getDocumentCard from "./actions/get-document-card.ts";
import listDocuments from "./actions/list-documents.ts";
import updateDocument from "./actions/update-document.ts";
import deleteDocument from "./actions/delete-document.ts";
import listTemplates from "./actions/list-templates.ts";
import getTemplate from "./actions/get-template.ts";
import createTemplate from "./actions/create-template.ts";
import updateTemplate from "./actions/update-template.ts";
import deleteTemplate from "./actions/delete-template.ts";
import listEngines from "./actions/list-engines.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    createDocument,
    createDocumentSync,
    getDocument,
    getDocumentCard,
    listDocuments,
    updateDocument,
    deleteDocument,
    listTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    listEngines,
  ],
  auth: [bearerToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
