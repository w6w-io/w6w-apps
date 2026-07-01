import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import serviceAccount from "./auth/service-account.ts";

// message
import sendMessage from "./actions/send-message.ts";
import getMessage from "./actions/get-message.ts";
import getManyMessages from "./actions/get-many-messages.ts";
import deleteMessage from "./actions/delete-message.ts";
import replyMessage from "./actions/reply-message.ts";
import addMessageLabels from "./actions/add-message-labels.ts";
import removeMessageLabels from "./actions/remove-message-labels.ts";
import markMessageRead from "./actions/mark-message-read.ts";
import markMessageUnread from "./actions/mark-message-unread.ts";

// draft
import createDraft from "./actions/create-draft.ts";
import getDraft from "./actions/get-draft.ts";
import getManyDrafts from "./actions/get-many-drafts.ts";
import deleteDraft from "./actions/delete-draft.ts";
import sendDraft from "./actions/send-draft.ts";

// label
import createLabel from "./actions/create-label.ts";
import getLabel from "./actions/get-label.ts";
import getManyLabels from "./actions/get-many-labels.ts";
import deleteLabel from "./actions/delete-label.ts";

// thread
import getThread from "./actions/get-thread.ts";
import getManyThreads from "./actions/get-many-threads.ts";
import addThreadLabels from "./actions/add-thread-labels.ts";
import removeThreadLabels from "./actions/remove-thread-labels.ts";
import trashThread from "./actions/trash-thread.ts";
import untrashThread from "./actions/untrash-thread.ts";
import replyThread from "./actions/reply-thread.ts";

export default {
  actions: [
    sendMessage,
    getMessage,
    getManyMessages,
    deleteMessage,
    replyMessage,
    addMessageLabels,
    removeMessageLabels,
    markMessageRead,
    markMessageUnread,
    createDraft,
    getDraft,
    getManyDrafts,
    deleteDraft,
    sendDraft,
    createLabel,
    getLabel,
    getManyLabels,
    deleteLabel,
    getThread,
    getManyThreads,
    addThreadLabels,
    removeThreadLabels,
    trashThread,
    untrashThread,
    replyThread,
  ],
  auth: [oauth2, serviceAccount],
} satisfies AppDefinition;
