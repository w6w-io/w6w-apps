import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";
import oauth2 from "./auth/oauth2.ts";

import channelArchive from "./actions/channel-archive.ts";
import channelClose from "./actions/channel-close.ts";
import channelCreate from "./actions/channel-create.ts";
import channelGet from "./actions/channel-get.ts";
import channelGetMany from "./actions/channel-get-many.ts";
import channelHistory from "./actions/channel-history.ts";
import channelInvite from "./actions/channel-invite.ts";
import channelJoin from "./actions/channel-join.ts";
import channelKick from "./actions/channel-kick.ts";
import channelLeave from "./actions/channel-leave.ts";
import channelMember from "./actions/channel-member.ts";
import channelOpen from "./actions/channel-open.ts";
import channelRename from "./actions/channel-rename.ts";
import channelReplies from "./actions/channel-replies.ts";
import channelSetPurpose from "./actions/channel-set-purpose.ts";
import channelSetTopic from "./actions/channel-set-topic.ts";
import channelUnarchive from "./actions/channel-unarchive.ts";

import messagePost from "./actions/message-post.ts";
import messageUpdate from "./actions/message-update.ts";
import messageDelete from "./actions/message-delete.ts";
import messageGetPermalink from "./actions/message-get-permalink.ts";
import messageSchedule from "./actions/message-schedule.ts";
import messageDeleteScheduled from "./actions/message-delete-scheduled.ts";
import messageGetManyScheduled from "./actions/message-get-many-scheduled.ts";
import messageSearch from "./actions/message-search.ts";

import reactionAdd from "./actions/reaction-add.ts";
import reactionRemove from "./actions/reaction-remove.ts";
import reactionGet from "./actions/reaction-get.ts";

import starAdd from "./actions/star-add.ts";
import starDelete from "./actions/star-delete.ts";
import starGetMany from "./actions/star-get-many.ts";

import fileUpload from "./actions/file-upload.ts";
import fileGet from "./actions/file-get.ts";
import fileGetMany from "./actions/file-get-many.ts";

import userGet from "./actions/user-get.ts";
import userLookupByEmail from "./actions/user-lookup-by-email.ts";
import userGetMany from "./actions/user-get-many.ts";
import userGetPresence from "./actions/user-get-presence.ts";
import userGetProfile from "./actions/user-get-profile.ts";
import userUpdateProfile from "./actions/user-update-profile.ts";

import userGroupCreate from "./actions/usergroup-create.ts";
import userGroupEnable from "./actions/usergroup-enable.ts";
import userGroupDisable from "./actions/usergroup-disable.ts";
import userGroupGetMany from "./actions/usergroup-get-many.ts";
import userGroupUpdate from "./actions/usergroup-update.ts";
import userGroupUpdateUsers from "./actions/usergroup-update-users.ts";
import userGroupGetUsers from "./actions/usergroup-get-users.ts";

export default {
  actions: [
    // channel
    channelArchive,
    channelClose,
    channelCreate,
    channelGet,
    channelGetMany,
    channelHistory,
    channelInvite,
    channelJoin,
    channelKick,
    channelLeave,
    channelMember,
    channelOpen,
    channelRename,
    channelReplies,
    channelSetPurpose,
    channelSetTopic,
    channelUnarchive,
    // message
    messagePost,
    messageUpdate,
    messageDelete,
    messageGetPermalink,
    messageSchedule,
    messageDeleteScheduled,
    messageGetManyScheduled,
    messageSearch,
    // reaction
    reactionAdd,
    reactionRemove,
    reactionGet,
    // star
    starAdd,
    starDelete,
    starGetMany,
    // file
    fileUpload,
    fileGet,
    fileGetMany,
    // user
    userGet,
    userLookupByEmail,
    userGetMany,
    userGetPresence,
    userGetProfile,
    userUpdateProfile,
    // usergroup
    userGroupCreate,
    userGroupEnable,
    userGroupDisable,
    userGroupGetMany,
    userGroupUpdate,
    userGroupUpdateUsers,
    userGroupGetUsers,
  ],
  auth: [accessToken, oauth2],
} satisfies AppDefinition;
