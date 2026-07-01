import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import chatComplete from "./actions/chat-complete.ts";
import imageGenerate from "./actions/image-generate.ts";
import imageEdit from "./actions/image-edit.ts";
import imageVariation from "./actions/image-variation.ts";
import audioTranscribe from "./actions/audio-transcribe.ts";
import audioTranslate from "./actions/audio-translate.ts";
import filesList from "./actions/files-list.ts";
import filesUpload from "./actions/files-upload.ts";
import filesDelete from "./actions/files-delete.ts";
import filesRetrieve from "./actions/files-retrieve.ts";
import embeddingsCreate from "./actions/embeddings-create.ts";
import moderationsCreate from "./actions/moderations-create.ts";
import listModels from "./actions/list-models.ts";

export default {
  actions: [
    chatComplete,
    imageGenerate,
    imageEdit,
    imageVariation,
    audioTranscribe,
    audioTranslate,
    filesList,
    filesUpload,
    filesDelete,
    filesRetrieve,
    embeddingsCreate,
    moderationsCreate,
    listModels,
  ],
  auth: [apiKey],
} satisfies AppDefinition;
