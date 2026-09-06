/**
 * Jina AI — the Search Foundation API: embeddings, reranking, classification
 * and asynchronous batch embedding jobs over `api.jina.ai`.
 *
 * Every path, verb, parameter and schema in this app was verified on
 * 2026-09-06 against Jina AI's own OpenAPI 3.1 document
 * (`https://api.jina.ai/openapi.json`, 102,860 bytes, `info.version`
 * `2026.07.27.1603`) plus live probes against `api.jina.ai` and
 * `status.jina.ai`. Nothing here came from a third-party integration
 * directory.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **This is one product of several, on one host of several**
 *     (`lib/client.ts`). Jina AI also runs Reader (`r.jina.ai`), Search
 *     (`s.jina.ai`) and DeepSearch — none of them covered by this OpenAPI
 *     document, so none of them is covered here.
 *  2. **Three documented health endpoints 404 in production** (`lib/client.ts`).
 *     `/health`, `/ready`, `/live` all answer `404 {"detail":"Invalid
 *     endpoint"}` live, despite being in the spec with no security
 *     requirement — almost certainly Kubernetes-internal routes leaked into
 *     the public document. Not implemented as actions or as the health check.
 *  3. **Two incompatible error envelope shapes** (`lib/client.ts`,
 *     `parseJinaError`). Most errors are `{detail: "...", code, request_id}`;
 *     a 404 and a bare 500 instead nest `detail` as `{message, code}`.
 *  4. **`/v1/classifiers` answers 500 for every credential** (`lib/client.ts`,
 *     `actions/classifiers-list.ts`). Missing key, invalid key, and a
 *     syntactically valid fake key all produced the identical
 *     `500 INTERNAL_ERROR` live — ruling it out as a health probe and
 *     flagging it as possibly broken independent of the caller's credential.
 *  5. **`chat-completions` declares no request schema at all**
 *     (`actions/chat-completions.ts`) — the vendor's own summary marks it
 *     "(Experimental)" with no availability guarantee, and the OpenAPI
 *     operation has no `requestBody` key whatsoever, so this action accepts a
 *     raw JSON body rather than pretending to a schema that doesn't exist.
 *
 * The icon is Jina AI's own mark, taken from the `x-logo.url` the vendor's
 * OpenAPI document itself points at.
 */
import type { AppDefinition } from "@w6w/types";
import bearerToken from "./auth/bearer-token.ts";

import embeddingsCreate from "./actions/embeddings-create.ts";
import rerank from "./actions/rerank.ts";
import classify from "./actions/classify.ts";
import classifierTrain from "./actions/classifier-train.ts";
import classifiersList from "./actions/classifiers-list.ts";
import classifierDelete from "./actions/classifier-delete.ts";
import modelsList from "./actions/models-list.ts";
import modelGet from "./actions/model-get.ts";
import chatCompletions from "./actions/chat-completions.ts";
import batchEmbeddingsCreate from "./actions/batch-embeddings-create.ts";
import batchGet from "./actions/batch-get.ts";
import batchCancel from "./actions/batch-cancel.ts";
import batchesList from "./actions/batches-list.ts";
import batchOutputGet from "./actions/batch-output-get.ts";
import batchErrorsGet from "./actions/batch-errors-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Embeddings
    embeddingsCreate,
    // Reranking
    rerank,
    // Classification
    classify,
    classifierTrain,
    classifiersList,
    classifierDelete,
    // Models
    modelsList,
    modelGet,
    // Chat (experimental)
    chatCompletions,
    // Batch embedding jobs
    batchEmbeddingsCreate,
    batchGet,
    batchCancel,
    batchesList,
    batchOutputGet,
    batchErrorsGet,
  ],
  // API key only. Jina AI publishes no OAuth surface for third-party apps.
  auth: [bearerToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
