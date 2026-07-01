import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import sendSms from "./actions/send-sms.ts";
import makeCall from "./actions/make-call.ts";

export default {
  actions: [sendSms, makeCall],
  auth: [apiKey],
} satisfies AppDefinition;
