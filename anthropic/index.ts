import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import messageCreate from "./actions/message-create.ts";
import countTokens from "./actions/count-tokens.ts";
import listModels from "./actions/list-models.ts";
import getModel from "./actions/get-model.ts";
import batchCreate from "./actions/batch-create.ts";
import batchList from "./actions/batch-list.ts";
import batchGet from "./actions/batch-get.ts";
import batchCancel from "./actions/batch-cancel.ts";
import batchDelete from "./actions/batch-delete.ts";
import batchResults from "./actions/batch-results.ts";
import fileUpload from "./actions/file-upload.ts";
import fileList from "./actions/file-list.ts";
import fileGet from "./actions/file-get.ts";
import fileDelete from "./actions/file-delete.ts";

export default {
  actions: [
    messageCreate,
    countTokens,
    listModels,
    getModel,
    batchCreate,
    batchList,
    batchGet,
    batchCancel,
    batchDelete,
    batchResults,
    fileUpload,
    fileList,
    fileGet,
    fileDelete,
  ],
  auth: [apiKey],
} satisfies AppDefinition;
