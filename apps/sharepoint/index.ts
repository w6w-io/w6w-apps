import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

// site
import getSite from "./actions/get-site.ts";
import listSubsites from "./actions/list-subsites.ts";

// drive (document library)
import getDrive from "./actions/get-drive.ts";
import listDrives from "./actions/list-drives.ts";

// list
import listLists from "./actions/list-lists.ts";
import getList from "./actions/get-list.ts";
import createList from "./actions/create-list.ts";

// list item
import listItems from "./actions/list-items.ts";
import getItem from "./actions/get-item.ts";
import createItem from "./actions/create-item.ts";
import updateItem from "./actions/update-item.ts";
import deleteItem from "./actions/delete-item.ts";

// drive item (document library contents)
import listChildren from "./actions/list-children.ts";
import uploadFile from "./actions/upload-file.ts";
import getDownloadUrl from "./actions/get-download-url.ts";
import createFolder from "./actions/create-folder.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import requestRate from "./health/request-rate.ts";

export default {
  actions: [
    getSite,
    listSubsites,
    getDrive,
    listDrives,
    listLists,
    getList,
    createList,
    listItems,
    getItem,
    createItem,
    updateItem,
    deleteItem,
    listChildren,
    uploadFile,
    getDownloadUrl,
    createFolder,
  ],
  auth: [oauth2],
  healthChecks: [service, quota, requestRate],
} satisfies AppDefinition;
