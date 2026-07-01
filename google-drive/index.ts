import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import serviceAccount from "./auth/service-account.ts";

import fileCopy from "./actions/file-copy.ts";
import fileCreateFromText from "./actions/file-create-from-text.ts";
import fileDownload from "./actions/file-download.ts";
import fileGet from "./actions/file-get.ts";
import fileList from "./actions/file-list.ts";
import fileShare from "./actions/file-share.ts";
import fileUpdate from "./actions/file-update.ts";
import fileUpload from "./actions/file-upload.ts";
import fileDelete from "./actions/file-delete.ts";

import folderCreate from "./actions/folder-create.ts";
import folderList from "./actions/folder-list.ts";
import folderShare from "./actions/folder-share.ts";
import folderDelete from "./actions/folder-delete.ts";

import driveCreate from "./actions/drive-create.ts";
import driveGet from "./actions/drive-get.ts";
import driveList from "./actions/drive-list.ts";
import driveDelete from "./actions/drive-delete.ts";
import driveUpdate from "./actions/drive-update.ts";

export default {
  actions: [
    fileCopy,
    fileCreateFromText,
    fileDownload,
    fileGet,
    fileList,
    fileShare,
    fileUpdate,
    fileUpload,
    fileDelete,

    folderCreate,
    folderList,
    folderShare,
    folderDelete,

    driveCreate,
    driveGet,
    driveList,
    driveDelete,
    driveUpdate,
  ],
  auth: [oauth2, serviceAccount],
} satisfies AppDefinition;
