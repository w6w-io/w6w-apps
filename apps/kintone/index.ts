import type { AppDefinition } from "@w6w/types";

import recordGet from "./actions/record-get.ts";
import recordAdd from "./actions/record-add.ts";
import recordUpdate from "./actions/record-update.ts";
import recordsSearch from "./actions/records-search.ts";
import recordsAdd from "./actions/records-add.ts";
import recordsDelete from "./actions/records-delete.ts";
import commentAdd from "./actions/comment-add.ts";
import commentsList from "./actions/comments-list.ts";
import appGet from "./actions/app-get.ts";
import appFieldsGet from "./actions/app-fields-get.ts";
import fileUpload from "./actions/file-upload.ts";
import fileDownload from "./actions/file-download.ts";

import apiToken from "./auth/api-token.ts";

import service from "./health/service.ts";
import site from "./health/site.ts";

export default {
  actions: [
    recordGet,
    recordAdd,
    recordUpdate,
    recordsSearch,
    recordsAdd,
    recordsDelete,
    commentAdd,
    commentsList,
    appGet,
    appFieldsGet,
    fileUpload,
    fileDownload,
  ],
  auth: [apiToken],
  healthChecks: [service, site],
} satisfies AppDefinition;
