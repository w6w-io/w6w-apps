/**
 * ClickSend — multi-channel messaging (SMS, MMS, voice, transactional email) and
 * contact-list management over the ClickSend REST API v3 (`rest.clicksend.com`).
 *
 * Every path, verb, field and status code here was verified on 2026-08-24 against
 * ClickSend's own API Blueprint document (Apiary, `jsapi.apiary.io/apis/clicksend.apib`,
 * 574 KB) plus live probes against `rest.clicksend.com`. Nothing came from a
 * third-party integration directory.
 *
 * Three findings that shaped the design, each documented in full where it matters:
 *
 *  1. **`GET /account` leaks a live credential** (`actions/account-get.ts`,
 *     `auth/basic-auth.ts`). Its `_subaccount.api_key` field is a working API key
 *     for the subaccount, verified live. `account-get` strips it before returning;
 *     the Auth health probe never calls this endpoint at all.
 *  2. **Missing, wrong, and not-yet-activated credentials are indistinguishable**
 *     (`auth/basic-auth.ts`). All three answer a byte-identical
 *     `401 UNAUTHORIZED`. Only a suspended account differs, with a distinct `403`.
 *  3. **The blueprint's own docs are wrong twice**: `account/usage/{y}/{m}/{type}`
 *     documents `type` as `"email"` or `"subaccount"`, but live testing shows only
 *     `"subaccount"` is accepted (`account-usage-get.ts`); and `email/send`'s
 *     request schema omits `subject` even though the worked example and every
 *     response require it (`send-email.ts`).
 *
 * `GET /countries` is genuinely public (200 with no credential and with a wrong
 * one, verified live) — it is the one Action declaring `requiresAuth: false`.
 */
import type { AppDefinition } from "@w6w/types";

import sendSms from "./actions/send-sms.ts";
import smsHistoryList from "./actions/sms-history-list.ts";
import smsCancel from "./actions/sms-cancel.ts";
import sendMms from "./actions/send-mms.ts";
import mmsHistoryList from "./actions/mms-history-list.ts";
import sendVoice from "./actions/send-voice.ts";
import voiceCancel from "./actions/voice-cancel.ts";
import voiceLanguagesList from "./actions/voice-languages-list.ts";
import sendEmail from "./actions/send-email.ts";
import emailAddressList from "./actions/email-address-list.ts";
import accountGet from "./actions/account-get.ts";
import accountUsageGet from "./actions/account-usage-get.ts";
import contactListCreate from "./actions/contact-list-create.ts";
import contactListList from "./actions/contact-list-list.ts";
import contactCreate from "./actions/contact-create.ts";
import countriesList from "./actions/countries-list.ts";

import basicAuth from "./auth/basic-auth.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    sendSms,
    smsHistoryList,
    smsCancel,
    sendMms,
    mmsHistoryList,
    sendVoice,
    voiceCancel,
    voiceLanguagesList,
    sendEmail,
    emailAddressList,
    accountGet,
    accountUsageGet,
    contactListCreate,
    contactListList,
    contactCreate,
    countriesList,
  ],
  // Basic auth only — ClickSend publishes no OAuth surface for third-party apps.
  auth: [basicAuth],
  healthChecks: [service, quota],
} satisfies AppDefinition;
