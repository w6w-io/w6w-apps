import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

// Generic DocType surface — every business object (Customer, Sales Order,
// Item, Lead, Employee, or a custom app's own DocType) shares this one
// endpoint shape, because that IS Frappe's REST API.
import listDocuments from "./actions/list-documents.ts";
import getDocument from "./actions/get-document.ts";
import countDocuments from "./actions/count-documents.ts";
import createDocument from "./actions/create-document.ts";
import updateDocument from "./actions/update-document.ts";
import deleteDocument from "./actions/delete-document.ts";

// The submit/cancel document lifecycle — ERPNext's draft → submitted →
// cancelled state machine for transactional DocTypes.
import submitDocument from "./actions/submit-document.ts";
import cancelDocument from "./actions/cancel-document.ts";

// Discovery, whoami and the remote-method escape hatch.
import getLoggedUser from "./actions/get-logged-user.ts";
import callMethod from "./actions/call-method.ts";

import instance from "./health/instance.ts";
import service from "./health/service.ts";

export default {
  actions: [
    listDocuments,
    getDocument,
    countDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    submitDocument,
    cancelDocument,
    getLoggedUser,
    callMethod,
  ],
  auth: [apiKey],
  healthChecks: [instance, service],
} satisfies AppDefinition;
