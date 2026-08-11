import type { ActionDefinition } from "@w6w/types";
import { DatadogClient } from "../lib/client.ts";

/**
 * `GET /api/v1/hosts` — hosts reporting to this organization.
 *
 * Two documented behaviours worth knowing before reading an empty result:
 *
 *  - **The default window is the last 3 hours**, and retention is 7 days. A host
 *    that stopped reporting yesterday is absent unless `from` reaches back for
 *    it. `from` is POSIX **seconds**.
 *  - **EC2 hosts are keyed differently**: Datadog's own note is that for an
 *    Amazon EC2 instance, `id` is replaced by `aws_id` in the response. Code
 *    that assumes `id` is always present drops exactly the cloud hosts.
 *
 * `count` maxes at 1000 and Datadog paginates by `start`/`count`.
 *
 * Needs the application key and the `hosts_read` scope.
 */
interface Input {
  filter?: string;
  sortField?: string;
  sortDir?: string;
  from?: number;
  start?: number;
  count?: number;
  includeMutedHostsData?: boolean;
  includeHostsMetadata?: boolean;
}

const hostList: ActionDefinition<Input> = {
  key: "host-list",
  type: "search",
  resource: "host",
  title: "List Hosts",
  description: "Search hosts by name, alias or tag.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "string",
      placeholder: "env:prod",
      hint: "Matches host name, alias or tag.",
    },
    { key: "sortField", label: "Sort field", type: "string", advanced: true },
    {
      key: "sortDir",
      label: "Sort direction",
      type: "select",
      advanced: true,
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
    },
    {
      key: "from",
      label: "Reporting since",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "POSIX timestamp in **seconds**. Without it Datadog returns only hosts that " +
        "reported in the last 3 hours; retention is 7 days either way.",
    },
    {
      key: "start",
      label: "Start offset",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 0 },
    },
    {
      key: "count",
      label: "Count",
      type: "number",
      default: 100,
      validation: { integer: true, min: 1, max: 1000 },
      hint: "Maximum 1000 per request.",
    },
    { key: "includeMutedHostsData", label: "Include mute status", type: "boolean", advanced: true },
    {
      key: "includeHostsMetadata",
      label: "Include host metadata",
      type: "boolean",
      advanced: true,
      hint: "Adds agent version, machine, platform and processor per host.",
    },
  ],
  output: [
    { key: "host_list", type: "array", label: "Hosts (EC2 instances carry `aws_id`, not `id`)" },
    { key: "total_matching", type: "number", label: "Total matching hosts" },
    { key: "total_returned", type: "number", label: "Hosts in this page" },
  ],

  execute(input, ctx) {
    return new DatadogClient(ctx).json("/api/v1/hosts", {
      query: {
        filter: input.filter,
        sort_field: input.sortField,
        sort_dir: input.sortDir,
        from: input.from,
        start: input.start,
        count: input.count,
        include_muted_hosts_data: input.includeMutedHostsData === true ? "true" : undefined,
        include_hosts_metadata: input.includeHostsMetadata === true ? "true" : undefined,
      },
    });
  },
};

export default hostList;
