import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import chatComplete from "./actions/chat-complete.ts";
import listModels from "./actions/list-models.ts";
import getModel from "./actions/get-model.ts";
import audioTranscribe from "./actions/audio-transcribe.ts";
import audioTranslate from "./actions/audio-translate.ts";
import audioSpeech from "./actions/audio-speech.ts";
import filesUpload from "./actions/files-upload.ts";
import filesList from "./actions/files-list.ts";
import filesRetrieve from "./actions/files-retrieve.ts";
import filesDownload from "./actions/files-download.ts";
import filesDelete from "./actions/files-delete.ts";
import batchCreate from "./actions/batch-create.ts";
import batchList from "./actions/batch-list.ts";
import batchGet from "./actions/batch-get.ts";
import batchCancel from "./actions/batch-cancel.ts";
import responseCreate from "./actions/response-create.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    chatComplete,
    listModels,
    getModel,
    audioTranscribe,
    audioTranslate,
    audioSpeech,
    filesUpload,
    filesList,
    filesRetrieve,
    filesDownload,
    filesDelete,
    batchCreate,
    batchList,
    batchGet,
    batchCancel,
    responseCreate,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
