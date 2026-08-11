import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

// drive
import listDrives from "./actions/list-drives.ts";
import getDrive from "./actions/get-drive.ts";

// drive item — read
import listChildren from "./actions/list-children.ts";
import getItem from "./actions/get-item.ts";
import searchItems from "./actions/search-items.ts";
import listChanges from "./actions/list-changes.ts";
import listSharedWithMe from "./actions/list-shared-with-me.ts";
import getDownloadUrl from "./actions/get-download-url.ts";

// drive item — write
import createFolder from "./actions/create-folder.ts";
import uploadFile from "./actions/upload-file.ts";
import copyItem from "./actions/copy-item.ts";
import moveItem from "./actions/move-item.ts";
import renameItem from "./actions/rename-item.ts";
import deleteItem from "./actions/delete-item.ts";

// sharing + permissions
import createLink from "./actions/create-link.ts";
import listPermissions from "./actions/list-permissions.ts";
import deletePermission from "./actions/delete-permission.ts";
import sendSharingInvite from "./actions/send-sharing-invite.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import requestRate from "./health/request-rate.ts";

export default {
  actions: [
    listDrives,
    getDrive,
    listChildren,
    getItem,
    searchItems,
    listChanges,
    listSharedWithMe,
    getDownloadUrl,
    createFolder,
    uploadFile,
    copyItem,
    moveItem,
    renameItem,
    deleteItem,
    createLink,
    listPermissions,
    deletePermission,
    sendSharingInvite,
  ],
  auth: [oauth2],
  healthChecks: [service, quota, requestRate],
} satisfies AppDefinition;
