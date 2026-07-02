import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";
import getAsset from "./actions/get-asset.ts";
import listAssets from "./actions/list-assets.ts";
import getContentType from "./actions/get-content-type.ts";
import listContentTypes from "./actions/list-content-types.ts";
import getEntry from "./actions/get-entry.ts";
import listEntries from "./actions/list-entries.ts";
import createEntry from "./actions/create-entry.ts";
import updateEntry from "./actions/update-entry.ts";
import deleteEntry from "./actions/delete-entry.ts";
import listLocales from "./actions/list-locales.ts";

export default {
  actions: [
    getAsset,
    listAssets,
    getContentType,
    listContentTypes,
    getEntry,
    listEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    listLocales,
  ],
  auth: [accessToken],
} satisfies AppDefinition;
