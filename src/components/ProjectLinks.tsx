"use client";

import { useState } from "react";
import {
  Link as LinkIcon,
  ExternalLink,
  Github,
  Globe,
  FileText,
  BookOpen,
  Bug,
  MessageSquare,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
} from "lucide-react";
import {
  useProjectLinks,
  useCreateProjectLink,
  useUpdateProjectLink,
  useDeleteProjectLink,
  type ProjectLink,
} from "@/hooks/use-project-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ICON_OPTIONS = [
  { value: "link", label: "Link", Icon: LinkIcon },
  { value: "globe", label: "Globe", Icon: Globe },
  { value: "github", label: "GitHub", Icon: Github },
  { value: "file-text", label: "Docs", Icon: FileText },
  { value: "book-open", label: "Wiki", Icon: BookOpen },
  { value: "bug", label: "Bug tracker", Icon: Bug },
  { value: "message-square", label: "Chat", Icon: MessageSquare },
  { value: "external-link", label: "External", Icon: ExternalLink },
] as const;

function getLinkIcon(icon: string) {
  const match = ICON_OPTIONS.find((o) => o.value === icon);
  return match?.Icon ?? LinkIcon;
}

interface ProjectLinksProps {
  projectId: string;
}

export function ProjectLinks({ projectId }: ProjectLinksProps) {
  const { data: links = [] } = useProjectLinks(projectId);
  const createLink = useCreateProjectLink();
  const updateLink = useUpdateProjectLink();
  const deleteLink = useDeleteProjectLink();

  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {links.map((link) =>
        editingId === link.id ? (
          <EditLinkForm
            key={link.id}
            link={link}
            projectId={projectId}
            onSave={(data) => {
              updateLink.mutate(
                { id: link.id, projectId, ...data },
                { onSettled: () => setEditingId(null) }
              );
            }}
            onDelete={() => {
              deleteLink.mutate({ id: link.id, projectId });
              setEditingId(null);
            }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <LinkPill
            key={link.id}
            link={link}
            onEdit={() => setEditingId(link.id)}
          />
        )
      )}

      <Popover open={addOpen} onOpenChange={setAddOpen}>
        <PopoverTrigger className="flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <Plus size={12} />
        </PopoverTrigger>
        <PopoverContent
          className="w-72 bg-popover border-border p-3"
          align="start"
        >
          <AddLinkForm
            projectId={projectId}
            isPending={createLink.isPending}
            onSubmit={(data) => {
              createLink.mutate(data, {
                onSuccess: () => setAddOpen(false),
              });
            }}
            onCancel={() => setAddOpen(false)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function LinkPill({
  link,
  onEdit,
}: {
  link: ProjectLink;
  onEdit: () => void;
}) {
  const Icon = getLinkIcon(link.icon);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onContextMenu={(e) => {
              e.preventDefault();
              onEdit();
            }}
            className="group flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted border border-border hover:border-foreground/30 hover:bg-accent transition-colors text-xs text-foreground hover:text-foreground"
          />
        }
      >
        <Icon size={12} className="text-muted-foreground group-hover:text-foreground shrink-0" />
        <span className="truncate max-w-[120px]">{link.title}</span>
        <ExternalLink size={10} className="text-muted-foreground group-hover:text-muted-foreground shrink-0" />
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <p>{link.url}</p>
        <p className="text-muted-foreground mt-0.5">Right-click to edit</p>
      </TooltipContent>
    </Tooltip>
  );
}

function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {ICON_OPTIONS.map(({ value: v, label, Icon }) => (
        <Tooltip key={v}>
          <TooltipTrigger
            onClick={() => onChange(v)}
            className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
              value === v
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <Icon size={14} />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {label}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

function AddLinkForm({
  projectId,
  isPending,
  onSubmit,
  onCancel,
}: {
  projectId: string;
  isPending: boolean;
  onSubmit: (data: {
    projectId: string;
    title: string;
    url: string;
    icon: string;
  }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState("link");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    onSubmit({ projectId, title: title.trim(), url: url.trim(), icon });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs font-medium text-foreground">Add link</p>
      <Input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        className="h-7 text-xs"
      />
      <Input
        placeholder="https://..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        type="url"
        className="h-7 text-xs"
      />
      <IconPicker value={icon} onChange={setIcon} />
      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-7 text-xs"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isPending || !title.trim() || !url.trim()}
          className="h-7 text-xs"
        >
          Add
        </Button>
      </div>
    </form>
  );
}

function EditLinkForm({
  link,
  projectId,
  onSave,
  onDelete,
  onCancel,
}: {
  link: ProjectLink;
  projectId: string;
  onSave: (data: { title?: string; url?: string; icon?: string }) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(link.title);
  const [url, setUrl] = useState(link.url);
  const [icon, setIcon] = useState(link.icon);

  return (
    <Popover open onOpenChange={(open) => !open && onCancel()}>
      <PopoverTrigger className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent border border-border text-xs text-foreground">
        <Pencil size={12} />
        <span className="truncate max-w-[120px]">{link.title}</span>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 bg-popover border-border p-3"
        align="start"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ title: title.trim(), url: url.trim(), icon });
          }}
          className="space-y-3"
        >
          <p className="text-xs font-medium text-foreground">Edit link</p>
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            className="h-7 text-xs"
          />
          <Input
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            type="url"
            className="h-7 text-xs"
          />
          <IconPicker value={icon} onChange={setIcon} />
          <div className="flex justify-between pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30"
            >
              <Trash2 size={12} className="mr-1" /> Delete
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="h-7 text-xs"
              >
                <X size={12} />
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!title.trim() || !url.trim()}
                className="h-7 text-xs"
              >
                <Check size={12} />
              </Button>
            </div>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
