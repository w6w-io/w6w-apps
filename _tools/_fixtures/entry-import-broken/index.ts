import type { AppDefinition } from "@w6w/types";
// Deliberately broken: this relative import does not exist, so the entry
// module fails to load. Used by `_tools/audit.test.ts` to pin the
// `entry/import` check's liveness — see T1.1.1.
import "./does-not-exist.ts";

export default {
  actions: [],
} satisfies AppDefinition;
