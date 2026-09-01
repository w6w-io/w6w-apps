import type { AppDefinition } from "@w6w/types";
import accessKey from "./auth/access-key.ts";
import sendSms from "./actions/send-sms.ts";
import messageGet from "./actions/message-get.ts";
import messageList from "./actions/message-list.ts";
import verifyRequest from "./actions/verify-request.ts";
import verifyCheck from "./actions/verify-check.ts";
import lookupNumber from "./actions/lookup-number.ts";
import voiceMessageSend from "./actions/voice-message-send.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    sendSms,
    messageGet,
    messageList,
    verifyRequest,
    verifyCheck,
    lookupNumber,
    voiceMessageSend,
  ],
  auth: [accessKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
