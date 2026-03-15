import { tool } from "ai";
import { z } from "zod";
import * as projectService from "@/server/services/project-service";
import * as sectionService from "@/server/services/section-service";
import * as itemService from "@/server/services/item-service";
import * as noteService from "@/server/services/note-service";
import * as boardService from "@/server/services/board-service";
import * as activityService from "@/server/services/activity-service";
import * as linkService from "@/server/services/project-link-service";

export function createTools(orgId: string, userId: string, userName: string) {
  return {
    listProjects: tool({
      description: "List all projects in the organization",
      inputSchema: z.object({}),
      execute: async () => {
        return projectService.listProjects(orgId);
      },
    }),

    getProjectStats: tool({
      description: "Get project stats with section/item counts and completion percentage",
      inputSchema: z.object({}),
      execute: async () => {
        return projectService.getProjectStats(orgId);
      },
    }),

    createProject: tool({
      description: "Create a new project",
      inputSchema: z.object({
        name: z.string().describe("Project name (1-100 chars)"),
        description: z.string().optional().describe("Project description (max 500 chars)"),
      }),
      execute: async ({ name, description }) => {
        return projectService.createProject(orgId, userId, userName, { name, description });
      },
    }),

    updateProject: tool({
      description: "Update a project's name or description",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID to update"),
        name: z.string().optional().describe("New project name"),
        description: z.string().optional().describe("New project description"),
      }),
      execute: async ({ projectId, name, description }) => {
        const result = await projectService.updateProject(orgId, userId, userName, projectId, { name, description });
        if (!result) return { error: "Project not found" };
        if ("error" in result) return result;
        return result;
      },
    }),

    deleteProject: tool({
      description: "Delete a project and all its data. This is irreversible.",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID to delete"),
      }),
      needsApproval: true,
      execute: async ({ projectId }) => {
        const result = await projectService.deleteProject(orgId, userId, userName, projectId);
        if (!result) return { error: "Project not found" };
        return { success: true, deleted: result.name };
      },
    }),

    getBoard: tool({
      description: "Get the full board for a project with sections and items. Notes are returned as counts only — use getItemNotes to read full notes.",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID"),
      }),
      execute: async ({ projectId }) => {
        const result = await boardService.getBoardForAI(orgId, projectId);
        if (!result) return { error: "Project not found" };
        return result;
      },
    }),

    listSections: tool({
      description: "List sections for a project with item counts (lightweight, no items returned)",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID"),
      }),
      execute: async ({ projectId }) => {
        const result = await sectionService.listSections(orgId, projectId);
        if (result === null) return { error: "Project not found" };
        return result;
      },
    }),

    createSection: tool({
      description: "Create a new section (column) in a project",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID"),
        title: z.string().describe("Section title (1-100 chars)"),
        color: z.string().optional().describe("Section color"),
        icon: z.string().optional().describe("Section icon name"),
      }),
      execute: async ({ projectId, title, color, icon }) => {
        return sectionService.createSection(orgId, userId, userName, {
          projectId,
          title,
          color,
          icon,
        });
      },
    }),

    updateSection: tool({
      description: "Update a section's title, color, or icon",
      inputSchema: z.object({
        sectionId: z.string().describe("The section ID to update"),
        title: z.string().optional().describe("New section title"),
        color: z.string().nullable().optional().describe("New section color"),
        icon: z.string().nullable().optional().describe("New section icon"),
      }),
      execute: async ({ sectionId, ...data }) => {
        const result = await sectionService.updateSection(orgId, userId, userName, sectionId, data);
        if (!result) return { error: "Section not found" };
        return result;
      },
    }),

    deleteSection: tool({
      description: "Delete a section and all its items. This is irreversible.",
      inputSchema: z.object({
        sectionId: z.string().describe("The section ID to delete"),
      }),
      needsApproval: true,
      execute: async ({ sectionId }) => {
        const result = await sectionService.deleteSection(orgId, userId, userName, sectionId);
        if (!result) return { error: "Section not found" };
        return { success: true, deleted: result.title };
      },
    }),

    createItem: tool({
      description: "Create a new item (task) in a section",
      inputSchema: z.object({
        sectionId: z.string().describe("The section ID to add the item to"),
        text: z.string().describe("Item text (1-500 chars)"),
      }),
      execute: async ({ sectionId, text }) => {
        return itemService.createItem(orgId, userId, userName, { sectionId, text });
      },
    }),

    updateItem: tool({
      description: "Update an item's text, checked state, order, or move it to another section",
      inputSchema: z.object({
        itemId: z.string().describe("The item ID to update"),
        text: z.string().optional().describe("New item text"),
        checked: z.boolean().optional().describe("Check/uncheck the item"),
        order: z.number().optional().describe("New sort order"),
        sectionId: z.string().optional().describe("Move item to a different section by ID"),
      }),
      execute: async ({ itemId, text, checked, order, sectionId }) => {
        const result = await itemService.updateItem(orgId, userId, userName, itemId, { text, checked, order, sectionId });
        if (!result) return { error: "Item not found" };
        return result;
      },
    }),

    deleteItem: tool({
      description: "Delete an item. This is irreversible.",
      inputSchema: z.object({
        itemId: z.string().describe("The item ID to delete"),
      }),
      needsApproval: true,
      execute: async ({ itemId }) => {
        const result = await itemService.deleteItem(orgId, userId, userName, itemId);
        if (!result) return { error: "Item not found" };
        return { success: true, deleted: result.text };
      },
    }),

    setItemTags: tool({
      description: "Set tags on an item. Replaces all existing tags. Available tags: bug, question, later",
      inputSchema: z.object({
        itemId: z.string().describe("The item ID"),
        tags: z.array(z.enum(["bug", "question", "later"])).describe("Tags to set"),
      }),
      execute: async ({ itemId, tags }) => {
        const result = await itemService.setItemTags(orgId, userId, userName, itemId, tags);
        if (!result) return { error: "Item not found" };
        return result;
      },
    }),

    searchItems: tool({
      description: "Search items by text across a project or all projects. Returns up to 20 results.",
      inputSchema: z.object({
        query: z.string().describe("Search text"),
        projectId: z.string().optional().describe("Limit search to a specific project"),
      }),
      execute: async ({ query, projectId }) => {
        return itemService.searchItems(orgId, query, projectId);
      },
    }),

    getItemNotes: tool({
      description: "Get all notes for a specific item",
      inputSchema: z.object({
        itemId: z.string().describe("The item ID"),
      }),
      execute: async ({ itemId }) => {
        const result = await noteService.getItemNotes(orgId, itemId);
        if (result === null) return { error: "Item not found" };
        return result;
      },
    }),

    createNote: tool({
      description: "Add a note to an item. Notes are immutable — they cannot be edited after creation.",
      inputSchema: z.object({
        itemId: z.string().describe("The item ID to add a note to"),
        text: z.string().describe("Note text (1-2000 chars)"),
      }),
      execute: async ({ itemId, text }) => {
        return noteService.createNote(orgId, userId, userName, { itemId, text });
      },
    }),

    deleteNote: tool({
      description: "Delete a note. This is irreversible.",
      inputSchema: z.object({
        noteId: z.string().describe("The note ID to delete"),
      }),
      needsApproval: true,
      execute: async ({ noteId }) => {
        const result = await noteService.deleteNote(orgId, userId, userName, noteId);
        if (!result) return { error: "Note not found" };
        return { success: true };
      },
    }),

    getActivity: tool({
      description: "Get the activity log for a project, showing recent changes",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID"),
        limit: z.number().optional().describe("Max results (default 20)"),
      }),
      execute: async ({ projectId, limit }) => {
        const result = await activityService.getActivity(orgId, projectId, limit ?? 20);
        if (result === null) return { error: "Project not found" };
        return result;
      },
    }),

    listProjectLinks: tool({
      description: "List external links for a project",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID"),
      }),
      execute: async ({ projectId }) => {
        const result = await linkService.listLinks(orgId, projectId);
        if (result === null) return { error: "Project not found" };
        return result;
      },
    }),

    createProjectLink: tool({
      description: "Add an external link to a project",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID"),
        title: z.string().describe("Link title"),
        url: z.string().describe("Link URL"),
        icon: z.string().optional().describe("Icon name (default: 'link')"),
      }),
      execute: async ({ projectId, title, url, icon }) => {
        return linkService.createLink(orgId, userId, { projectId, title, url, icon });
      },
    }),

    updateProjectLink: tool({
      description: "Update an existing project link",
      inputSchema: z.object({
        linkId: z.string().describe("The link ID to update"),
        title: z.string().optional().describe("New link title"),
        url: z.string().optional().describe("New link URL"),
        icon: z.string().optional().describe("New icon name"),
      }),
      execute: async ({ linkId, ...data }) => {
        const result = await linkService.updateLink(orgId, linkId, data);
        if (!result) return { error: "Link not found" };
        return result;
      },
    }),

    deleteProjectLink: tool({
      description: "Delete a project link. This is irreversible.",
      inputSchema: z.object({
        linkId: z.string().describe("The link ID to delete"),
      }),
      needsApproval: true,
      execute: async ({ linkId }) => {
        const result = await linkService.deleteLink(orgId, linkId);
        if (!result) return { error: "Link not found" };
        return { success: true };
      },
    }),
  };
}
