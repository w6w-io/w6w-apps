import type { AppDefinition } from "@w6w/types";
import botToken from "./auth/bot-token.ts";
import oauth2 from "./auth/oauth2.ts";

// channel
import createChannel from "./actions/create-channel.ts";
import getChannel from "./actions/get-channel.ts";
import listChannels from "./actions/list-channels.ts";
import updateChannel from "./actions/update-channel.ts";
import deleteChannel from "./actions/delete-channel.ts";

// message
import sendMessage from "./actions/send-message.ts";
import getMessage from "./actions/get-message.ts";
import listMessages from "./actions/list-messages.ts";
import deleteMessage from "./actions/delete-message.ts";
import reactMessage from "./actions/react-message.ts";

// member
import listMembers from "./actions/list-members.ts";
import addMemberRole from "./actions/add-member-role.ts";
import removeMemberRole from "./actions/remove-member-role.ts";

// role
import listRoles from "./actions/list-roles.ts";
import createRole from "./actions/create-role.ts";
import updateRole from "./actions/update-role.ts";
import deleteRole from "./actions/delete-role.ts";

// guild
import listGuilds from "./actions/list-guilds.ts";
import getGuild from "./actions/get-guild.ts";

export default {
  actions: [
    createChannel,
    getChannel,
    listChannels,
    updateChannel,
    deleteChannel,
    sendMessage,
    getMessage,
    listMessages,
    deleteMessage,
    reactMessage,
    listMembers,
    addMemberRole,
    removeMemberRole,
    listRoles,
    createRole,
    updateRole,
    deleteRole,
    listGuilds,
    getGuild,
  ],
  auth: [botToken, oauth2],
} satisfies AppDefinition;
