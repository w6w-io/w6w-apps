import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";
import accessToken from "./auth/access-token.ts";
import getUser from "./actions/get-user.ts";
import listWorkspaces from "./actions/list-workspaces.ts";
import listRepositories from "./actions/list-repositories.ts";
import getRepository from "./actions/get-repository.ts";
import listWorkspaceEvents from "./actions/list-workspace-events.ts";
import listRepositoryEvents from "./actions/list-repository-events.ts";
import listWorkspaceHooks from "./actions/list-workspace-hooks.ts";
import createWorkspaceHook from "./actions/create-workspace-hook.ts";
import deleteWorkspaceHook from "./actions/delete-workspace-hook.ts";
import listRepositoryHooks from "./actions/list-repository-hooks.ts";
import createRepositoryHook from "./actions/create-repository-hook.ts";
import deleteRepositoryHook from "./actions/delete-repository-hook.ts";

export default {
  actions: [
    getUser,
    listWorkspaces,
    listRepositories,
    getRepository,
    listWorkspaceEvents,
    listRepositoryEvents,
    listWorkspaceHooks,
    createWorkspaceHook,
    deleteWorkspaceHook,
    listRepositoryHooks,
    createRepositoryHook,
    deleteRepositoryHook,
  ],
  auth: [basic, accessToken],
} satisfies AppDefinition;
