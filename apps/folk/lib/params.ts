import type { Param } from "@w6w/types";

/** Shared by every `/network/{networkId}/group/{groupId}/...` action. From `list-groups`. */
export const groupIdParam: Param = {
  key: "groupId",
  label: "Group ID",
  type: "string",
  required: true,
  hint: "From list-groups.",
};
