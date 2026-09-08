import type { ActionDefinition } from "@w6w/types";

interface AddressSpec {
  street: string;
  city?: string;
}

interface Input {
  name: string;
  address?: AddressSpec;
}

/** A legitimate `group` with non-empty `children` — must NOT be flagged. */
const createThingOk: ActionDefinition<Input> = {
  key: "create-thing-ok",
  type: "perform",
  resource: "thing",
  title: "Create Thing (with a real group)",
  description: "Fixture action with a legitimate, non-empty `group` param.",
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "address",
      label: "Address",
      type: "group",
      children: [
        { key: "street", label: "Street", type: "string", required: true },
        { key: "city", label: "City", type: "string" },
      ],
    },
  ],
  execute(input, _ctx) {
    return { name: input.name, address: input.address };
  },
};

export default createThingOk;
