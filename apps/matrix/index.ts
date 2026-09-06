/**
 * Matrix — send and read messages, manage rooms and membership, and manage
 * your profile, against any Matrix homeserver's Client-Server API
 * (`<homeserver>/_matrix/client/v3/...`).
 *
 * Every path, verb, body field and error shape here was verified 2026-09-06
 * against the official spec at
 * `https://spec.matrix.org/latest/client-server-api/` — the "latest" render
 * of the Client-Server API. Nothing here came from a third-party integration
 * directory.
 *
 * Findings that shaped the design, each documented in full where it matters:
 *
 *  1. **There is no vendor API host — the homeserver is the host**
 *     (`lib/client.ts`). `matrix.org` is one homeserver among an unknowable
 *     number of federated, independently-run ones, so the homeserver URL is
 *     an Auth field and the manifest allows `*`.
 *  2. **Almost everything is under `/_matrix/client/v3`, except capability
 *     discovery** (`health/instance.ts`). `GET /_matrix/client/versions`
 *     deliberately carries no version prefix, and it is the only endpoint in
 *     this app that doesn't.
 *  3. **Errors are a structured `{errcode, error}` envelope, not just a
 *     status code** (`auth/*.ts`, `lib/client.ts`) — a 401 is only ever
 *     called "the credential is dead" when the body's own `errcode` is
 *     `M_UNKNOWN_TOKEN`/`M_MISSING_TOKEN`, per the spec's own guidance to
 *     prefer `errcode` over the transport status.
 *  4. **A message send's `{txnId}` path segment is the spec's own
 *     idempotency key** (`actions/send-message.ts`) — using
 *     `ctx.invocation.invocationId` as that id means a retried invocation is
 *     de-duplicated by the homeserver itself, which is what makes marking
 *     that action `idempotent: true` honest rather than optimistic.
 *  5. **End-to-end encryption is a deliberate scope cut**, not an oversight —
 *     see the README. Matrix's E2EE model keys every message to a specific
 *     device's Olm/Megolm session state (device identity keys, one-time
 *     keys, per-room Megolm sessions that must ratchet forward and be shared
 *     out-of-band with each new device) — none of which has anywhere to live
 *     in a stateless, replayable action model. Every action in this app talks
 *     to rooms that are not end-to-end encrypted.
 */
import type { AppDefinition } from "@w6w/types";

import accessToken from "./auth/access-token.ts";
import password from "./auth/password.ts";

import createRoom from "./actions/create-room.ts";
import joinRoom from "./actions/join-room.ts";
import leaveRoom from "./actions/leave-room.ts";
import inviteUser from "./actions/invite-user.ts";
import kickUser from "./actions/kick-user.ts";
import banUser from "./actions/ban-user.ts";
import unbanUser from "./actions/unban-user.ts";
import sendMessage from "./actions/send-message.ts";
import getMessages from "./actions/get-messages.ts";
import listJoinedRooms from "./actions/list-joined-rooms.ts";
import listRoomMembers from "./actions/list-room-members.ts";
import getProfile from "./actions/get-profile.ts";
import setDisplayName from "./actions/set-display-name.ts";
import setAvatarUrl from "./actions/set-avatar-url.ts";

import service from "./health/service.ts";
import instance from "./health/instance.ts";

export default {
  actions: [
    // messaging
    sendMessage,
    getMessages,
    // rooms
    createRoom,
    joinRoom,
    leaveRoom,
    listJoinedRooms,
    listRoomMembers,
    // membership
    inviteUser,
    kickUser,
    banUser,
    unbanUser,
    // profile
    getProfile,
    setDisplayName,
    setAvatarUrl,
  ],
  auth: [accessToken, password],
  healthChecks: [service, instance],
} satisfies AppDefinition;
