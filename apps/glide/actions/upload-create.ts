import type { ActionDefinition } from "@w6w/types";
import { GlideClient } from "../lib/client.ts";

/**
 * `POST /apps/{appID}/uploads` — start a file upload and get a pre-signed URL
 * to put the file's bytes to.
 *
 * **This action only talks to `api.glideapps.com`.** Glide's own documented
 * flow has a middle step this app deliberately does not perform: PUTting the
 * file's bytes to `uploadLocation`, a pre-signed URL on Glide's storage
 * provider (observed at `storage.googleapis.com`, but the doc does not commit
 * to that host, and a pre-signed URL is exactly the kind of address this
 * app's manifest cannot enumerate in `network.allow` ahead of time). Feed
 * `uploadLocation` to a plain HTTP request step to do that PUT — with
 * `content-type` set to the same `contentType` passed here — then call
 * Complete Upload with the returned `uploadID`.
 */
interface Input {
  appId: string;
  contentType: string;
  fileName: string;
}

interface Output {
  uploadID: string;
  uploadLocation: string;
}

const uploadCreate: ActionDefinition<Input, Output> = {
  key: "upload-create",
  type: "perform",
  resource: "upload",
  title: "Create Upload",
  description: "Start a file upload and get a pre-signed URL to PUT the file's bytes to. Does " +
    "not itself upload the bytes — see the action's description for why.",
  idempotent: false,
  params: [
    { key: "appId", label: "App ID", type: "string", required: true },
    {
      key: "contentType",
      label: "Content type",
      type: "string",
      required: true,
      placeholder: "image/png",
      hint: "MIME type of the file, e.g. `image/png`.",
    },
    {
      key: "fileName",
      label: "File name",
      type: "string",
      required: true,
      placeholder: "logo.png",
    },
  ],
  output: [
    { key: "uploadID", type: "string", label: "Pass this to Complete Upload" },
    {
      key: "uploadLocation",
      type: "string",
      label: "Pre-signed URL — PUT the file bytes here with an HTTP request step",
    },
  ],

  execute(input, ctx) {
    return new GlideClient(ctx).data<Output>(
      `/apps/${encodeURIComponent(input.appId)}/uploads`,
      { method: "POST", body: { contentType: input.contentType, fileName: input.fileName } },
    );
  },
};

export default uploadCreate;
