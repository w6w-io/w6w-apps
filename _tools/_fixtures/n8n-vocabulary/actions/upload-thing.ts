import type { ActionDefinition } from "@w6w/types";

// NOTE (M7): this app used to expose a raw "binary property" mode before a
// rewrite — the phrase survives here only as a changelog comment, in CODE,
// not as text a user ever sees. A comment or a provenance attribution using
// this phrase must NOT trip the check; only a param's own label/hint/
// placeholder/description may.
interface Input {
  file: string;
}

const uploadThing: ActionDefinition<Input> = {
  key: "upload-thing",
  type: "perform",
  resource: "thing",
  title: "Upload Thing",
  description: "Fixture action for `param/n8n-vocabulary`.",
  params: [
    {
      key: "file",
      label: "File",
      type: "file",
      hint: "Provide the binary property containing the file to upload.",
    },
  ],
  execute(input, _ctx) {
    return { file: input.file };
  },
};

export default uploadThing;
