import { defineMcpOAuthConnection } from "../lib/define-mcp-oauth-connection";
import type { McpOAuthProvider } from "../lib/mcp-oauth";

export const clickupProvider: McpOAuthProvider = {
  name: "clickup",
  displayName: "ClickUp",
  mcpUrl: "https://mcp.clickup.com/mcp",
  resource: "https://mcp.clickup.com/mcp",
  scope: "read write",
  authorizationEndpoint: "https://mcp.clickup.com/oauth/authorize",
  tokenEndpoint: "https://mcp.clickup.com/oauth/token",
  registrationEndpoint: "https://mcp.clickup.com/oauth/register",
  tokenAuthMethod: "none",
  safeReadOnlyTools: [
    "clickup_search",
    "clickup_get_workspace_hierarchy",
    "clickup_get_task",
    "clickup_filter_tasks",
    "clickup_get_task_comments",
    "clickup_get_threaded_comments",
    "clickup_get_current_time_entry",
    "clickup_get_time_entries",
    "clickup_get_task_time_in_status",
    "clickup_get_bulk_tasks_time_in_status",
    "clickup_get_list",
    "clickup_get_folder",
    "clickup_get_workspace_members",
    "clickup_find_member_by_name",
    "clickup_resolve_assignees",
    "clickup_get_chat_channels",
    "clickup_get_chat_channel_messages",
    "clickup_get_chat_message_replies",
    "clickup_search_reminders",
    "clickup_get_custom_fields",
    "clickup_list_document_pages",
    "clickup_get_document_pages",
  ],
};

export default defineMcpOAuthConnection({
  provider: clickupProvider,
  description:
    "ClickUp workspace via official MCP: tasks, docs, chat/channels, threads, comments, and reporting. Use for searching work and creating tickets.",
});
