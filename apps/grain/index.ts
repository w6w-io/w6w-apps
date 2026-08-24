/**
 * Grain — the AI meeting-recording/notes assistant (grain.com), via its
 * **Public API v2** at `https://api.grain.com/_/public-api/v2/...`.
 *
 * ## Coverage
 *
 * Every non-OAuth2, non-legacy endpoint documented at
 * `https://developers.grain.com/` (fetched 2026-08-24) has an Action here:
 * recordings (list/get/transcript in three shapes/download/upload-url/
 * update/tag add+remove/share+unshare to a user and a team), hooks (create/
 * list/delete), and the workspace's users, teams and meeting types.
 *
 * ## Deliberately absent
 *
 *   - **OAuth2.** Grain documents a full Authorization Code + PKCE flow, but
 *     its own example token-exchange requests use a JSON body rather than
 *     the RFC 6749 form-encoded one every other OAuth2 app in this pack
 *     relies on — see the long note in `auth/api-key.ts` for why guessing at
 *     the host's default wire format here would risk a flow that fails on
 *     every connect attempt. A Personal or Workspace Access Token already
 *     covers everything an OAuth2 connection would.
 *   - **Uploading the actual file bytes.** `recording-upload-create` mints
 *     the single-use upload URL; the follow-up `PUT` of file bytes to that
 *     URL is left to whatever client obtained it, since the URL's host is
 *     not knowable in advance (mirrors this pack's `mux` `upload-create`).
 *   - **OAuth2 Generate/Refresh Token as Actions.** These are the
 *     credential-minting endpoints for the auth method above, not data
 *     operations — modelling them as Actions would let a workflow mint
 *     tokens outside the connect flow, which the credential-isolation model
 *     this pack follows does not support.
 *   - **The v1 "Personal API" / "Workspace API" legacy docs.** Grain's own
 *     docs say "we don't recommend usage of v1 anymore" and it will be
 *     sunset; this app targets v2 exclusively.
 *   - **A Trigger for inbound hook deliveries.** Create/List/Delete Hook are
 *     here because they are real endpoints that register/inspect/remove a
 *     delivery target, but modelling Grain's inbound payload as a
 *     `TriggerDefinition` (with signature verification, if Grain signs
 *     deliveries — undocumented) is separate work.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import recordingList from "./actions/recording-list.ts";
import recordingGet from "./actions/recording-get.ts";
import recordingTranscriptGet from "./actions/recording-transcript-get.ts";
import recordingTranscriptDownload from "./actions/recording-transcript-download.ts";
import recordingDownload from "./actions/recording-download.ts";
import recordingUploadCreate from "./actions/recording-upload-create.ts";
import recordingUpdate from "./actions/recording-update.ts";
import recordingTagAdd from "./actions/recording-tag-add.ts";
import recordingTagRemove from "./actions/recording-tag-remove.ts";
import recordingShareUser from "./actions/recording-share-user.ts";
import recordingUnshareUser from "./actions/recording-unshare-user.ts";
import recordingShareTeam from "./actions/recording-share-team.ts";
import recordingUnshareTeam from "./actions/recording-unshare-team.ts";
import hookCreate from "./actions/hook-create.ts";
import hookList from "./actions/hook-list.ts";
import hookDelete from "./actions/hook-delete.ts";
import userList from "./actions/user-list.ts";
import teamList from "./actions/team-list.ts";
import meetingTypeList from "./actions/meeting-type-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // recording
    recordingList,
    recordingGet,
    recordingTranscriptGet,
    recordingTranscriptDownload,
    recordingDownload,
    recordingUploadCreate,
    recordingUpdate,
    recordingTagAdd,
    recordingTagRemove,
    recordingShareUser,
    recordingUnshareUser,
    recordingShareTeam,
    recordingUnshareTeam,
    // hook
    hookCreate,
    hookList,
    hookDelete,
    // directory
    userList,
    teamList,
    meetingTypeList,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
