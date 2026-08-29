/**
 * Bannerbear — automated image and video generation from templates, over the
 * Bannerbear V5 REST API (`api.bannerbear.com`, `sync.api.bannerbear.com`).
 *
 * Every path, verb, request/response field and enum in this app was verified
 * on 2026-08-29 against Bannerbear's own machine-readable OpenAPI 3.0 document
 * (`https://api.bannerbear.com/v5/openapi.json`, 183,305 bytes, `info.title`
 * "Bannerbear V5 API"), cross-checked against the prose reference at
 * `https://developers.bannerbear.com/v5/` (327,992 bytes). See `lib/client.ts`
 * for the full module doc on hosts, auth, response shapes, and errors.
 *
 * Bannerbear's v5 surface has no `/movies` or `/collections` endpoint — those
 * are names from other integration directories describing older Bannerbear
 * API versions. The v5 equivalents covered here are `/animations` (video from
 * an Animation Template) and `/batches` (up to 100 images in one call).
 *
 * Three findings that shaped this app, each documented in full where it matters:
 *
 *  1. **Two hosts, one endpoint uses both** (`lib/client.ts`). Every action
 *     reaches `api.bannerbear.com` (async — submit, then poll or subscribe a
 *     Webhook); `image-create` alone can opt into `sync.api.bannerbear.com`
 *     for a synchronous render.
 *  2. **A credential-shaped secret exists, but only at one moment**
 *     (`actions/instant-url-create.ts`). An Instant URL's HMAC `signing_key`
 *     is returned exactly once, in the create response — no `GET` ever
 *     returns it again.
 *  3. **The vendor's own status page is unusable** (`health/service.ts`).
 *     `status.bannerbear.com` is linked from Bannerbear's own site but is a
 *     stale (last-modified 2023) client-rendered SPA with no reachable
 *     JSON/RSS/Atom feed — declared `unavailable` rather than faked.
 */
import type { AppDefinition } from "@w6w/types";
import bearerToken from "./auth/bearer-token.ts";

import accountGet from "./actions/account-get.ts";

import imageTemplateList from "./actions/image-template-list.ts";
import imageTemplateGet from "./actions/image-template-get.ts";
import imageTemplateCreate from "./actions/image-template-create.ts";
import imageTemplateUpdate from "./actions/image-template-update.ts";
import imageTemplateDelete from "./actions/image-template-delete.ts";

import imageCreate from "./actions/image-create.ts";
import imageGet from "./actions/image-get.ts";
import imageList from "./actions/image-list.ts";

import batchCreate from "./actions/batch-create.ts";
import batchGet from "./actions/batch-get.ts";
import batchList from "./actions/batch-list.ts";

import animationCreate from "./actions/animation-create.ts";
import animationGet from "./actions/animation-get.ts";
import animationList from "./actions/animation-list.ts";

import animationTemplateList from "./actions/animation-template-list.ts";
import animationTemplateGet from "./actions/animation-template-get.ts";
import animationTemplateCreate from "./actions/animation-template-create.ts";
import animationTemplateUpdate from "./actions/animation-template-update.ts";
import animationTemplateDelete from "./actions/animation-template-delete.ts";

import webhookList from "./actions/webhook-list.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import assetList from "./actions/asset-list.ts";
import assetGet from "./actions/asset-get.ts";
import assetUpload from "./actions/asset-upload.ts";
import assetCheck from "./actions/asset-check.ts";

import publicationList from "./actions/publication-list.ts";
import publicationGet from "./actions/publication-get.ts";
import publicationInstall from "./actions/publication-install.ts";

import instantUrlList from "./actions/instant-url-list.ts";
import instantUrlGet from "./actions/instant-url-get.ts";
import instantUrlCreate from "./actions/instant-url-create.ts";
import instantUrlUpdate from "./actions/instant-url-update.ts";
import instantUrlDelete from "./actions/instant-url-delete.ts";

import toolRemoveBg from "./actions/tool-remove-bg.ts";
import toolGenerateAiImage from "./actions/tool-generate-ai-image.ts";
import toolGenerateVoiceover from "./actions/tool-generate-voiceover.ts";
import toolSubtitleVideo from "./actions/tool-subtitle-video.ts";
import toolCreatePdf from "./actions/tool-create-pdf.ts";
import toolTrimVideo from "./actions/tool-trim-video.ts";
import toolConcatVideos from "./actions/tool-concat-videos.ts";
import toolResizeVideo from "./actions/tool-resize-video.ts";
import toolCropVideo from "./actions/tool-crop-video.ts";
import toolOverlayVideo from "./actions/tool-overlay-video.ts";
import toolOverlayImage from "./actions/tool-overlay-image.ts";
import toolAddAudio from "./actions/tool-add-audio.ts";
import toolAddCoverArt from "./actions/tool-add-cover-art.ts";
import toolCreateVideoSlideshow from "./actions/tool-create-video-slideshow.ts";
import toolApplyColorFilter from "./actions/tool-apply-color-filter.ts";
import toolSoftenVideo from "./actions/tool-soften-video.ts";
import toolCreateGifPreview from "./actions/tool-create-gif-preview.ts";

import toolJobList from "./actions/tool-job-list.ts";
import toolJobGet from "./actions/tool-job-get.ts";

import workflowList from "./actions/workflow-list.ts";
import workflowGet from "./actions/workflow-get.ts";
import workflowRunCreate from "./actions/workflow-run-create.ts";
import workflowRunGet from "./actions/workflow-run-get.ts";
import workflowRunList from "./actions/workflow-run-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Account
    accountGet,
    // Image templates
    imageTemplateList,
    imageTemplateGet,
    imageTemplateCreate,
    imageTemplateUpdate,
    imageTemplateDelete,
    // Images
    imageCreate,
    imageGet,
    imageList,
    // Batches (up to 100 images per call)
    batchCreate,
    batchGet,
    batchList,
    // Animations (video)
    animationCreate,
    animationGet,
    animationList,
    // Animation templates
    animationTemplateList,
    animationTemplateGet,
    animationTemplateCreate,
    animationTemplateUpdate,
    animationTemplateDelete,
    // Webhooks
    webhookList,
    webhookGet,
    webhookCreate,
    webhookUpdate,
    webhookDelete,
    // Assets
    assetList,
    assetGet,
    assetUpload,
    assetCheck,
    // Publications (public template library)
    publicationList,
    publicationGet,
    publicationInstall,
    // Instant URLs
    instantUrlList,
    instantUrlGet,
    instantUrlCreate,
    instantUrlUpdate,
    instantUrlDelete,
    // Tools (standalone video/image utilities)
    toolRemoveBg,
    toolGenerateAiImage,
    toolGenerateVoiceover,
    toolSubtitleVideo,
    toolCreatePdf,
    toolTrimVideo,
    toolConcatVideos,
    toolResizeVideo,
    toolCropVideo,
    toolOverlayVideo,
    toolOverlayImage,
    toolAddAudio,
    toolAddCoverArt,
    toolCreateVideoSlideshow,
    toolApplyColorFilter,
    toolSoftenVideo,
    toolCreateGifPreview,
    // Tool jobs
    toolJobList,
    toolJobGet,
    // Workflows
    workflowList,
    workflowGet,
    workflowRunCreate,
    workflowRunGet,
    workflowRunList,
  ],
  // API key only. Bannerbear publishes no OAuth surface for third-party apps.
  auth: [bearerToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
