import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";
import oauth2 from "./auth/oauth2.ts";
import uploadFile from "./actions/upload-file.ts";
import downloadFile from "./actions/download-file.ts";
import copyFile from "./actions/copy-file.ts";
import moveFile from "./actions/move-file.ts";
import deleteFile from "./actions/delete-file.ts";
import getFileMetadata from "./actions/get-file-metadata.ts";
import createFolder from "./actions/create-folder.ts";
import listFolder from "./actions/list-folder.ts";
import deleteFolder from "./actions/delete-folder.ts";
import moveFolder from "./actions/move-folder.ts";
import copyFolder from "./actions/copy-folder.ts";
import search from "./actions/search.ts";

export default {
  actions: [
    uploadFile,
    downloadFile,
    copyFile,
    moveFile,
    deleteFile,
    getFileMetadata,
    createFolder,
    listFolder,
    deleteFolder,
    moveFolder,
    copyFolder,
    search,
  ],
  auth: [accessToken, oauth2],
} satisfies AppDefinition;
