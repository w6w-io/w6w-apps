import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";

import userGet from "./actions/user-get.ts";
import videoCreate from "./actions/video-create.ts";
import videoGet from "./actions/video-get.ts";
import videoList from "./actions/video-list.ts";
import videoDelete from "./actions/video-delete.ts";
import videoTranslationCreate from "./actions/video-translation-create.ts";
import videoTranslationGet from "./actions/video-translation-get.ts";
import videoTranslationList from "./actions/video-translation-list.ts";
import videoTranslationLanguagesList from "./actions/video-translation-languages-list.ts";
import avatarGroupList from "./actions/avatar-group-list.ts";
import avatarLookList from "./actions/avatar-look-list.ts";
import voiceList from "./actions/voice-list.ts";
import voiceSpeechGenerate from "./actions/voice-speech-generate.ts";
import assetUpload from "./actions/asset-upload.ts";
import assetGet from "./actions/asset-get.ts";
import templateList from "./actions/template-list.ts";
import templateGet from "./actions/template-get.ts";
import templateVideoGenerate from "./actions/template-video-generate.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import requestRate from "./health/request-rate.ts";

export default {
  actions: [
    userGet,
    videoCreate,
    videoGet,
    videoList,
    videoDelete,
    videoTranslationCreate,
    videoTranslationGet,
    videoTranslationList,
    videoTranslationLanguagesList,
    avatarGroupList,
    avatarLookList,
    voiceList,
    voiceSpeechGenerate,
    assetUpload,
    assetGet,
    templateList,
    templateGet,
    templateVideoGenerate,
  ],
  auth: [apiKey],
  healthChecks: [service, quota, requestRate],
} satisfies AppDefinition;
