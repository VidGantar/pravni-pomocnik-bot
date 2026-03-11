import React from 'react';
import { cn } from '@/lib/utils';
import { Plus, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface Conversation {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'Aktiven', className: 'bg-primary/10 text-primary border-primary/20' },
  pending_support: { label: 'Čaka podporo', className: 'bg-pending/10 text-pending border-pending/20' },
  resolved_chat: { label: 'Rešen', className: 'bg-success/10 text-success border-success/20' },
  resolved_support: { label: 'Rešen (podpora)', className: 'bg-success/10 text-success border-success/20' },
};

const ChatSidebar: React.FC<ChatSidebarProps> = ({ conversations, activeId, onSelect, onNew }) => {
  // Sort: active/pending first, resolved last
  const sorted = [...conversations].sort((a, b) => {
    const aResolved = a.status.startsWith('resolved');
    const bResolved = b.status.startsWith('resolved');
    if (aResolved !== bResolved) return aResolved ? 1 : -1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  // Capitalize first letter of title
  const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

  return (
    <div className="flex h-full w-72 flex-col border-r border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-display text-sm font-semibold text-foreground">Zgodovina</h2>
        <Button variant="ghost" size="icon" onClick={onNew} title="Nov pogovor">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="relative flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="space-y-1 p-2">
            {sorted.map(conv => {
              const config = statusConfig[conv.status] || statusConfig.active;
              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={cn(
                    'flex w-full flex-col gap-1 rounded-lg px-3 py-2.5 text-left transition-colors',
                    activeId === conv.id
                      ? 'bg-accent'
                      : 'hover:bg-muted',
                    conv.status.startsWith('resolved') && 'opacity-60'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground truncate max-w-[75%]">
                      {capitalize(conv.title)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pl-5.5">
                    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', config.className)}>
                      {config.label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(conv.updated_at).toLocaleDateString('sl-SI')}
                    </span>
                  </div>
                </button>
              );
            })}
            {conversations.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Ni pogovorov. Začnite novega!
              </div>
            )}
          </div>
        </ScrollArea>
        {/* Fade overlay at bottom of scroll area */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent" />
      </div>
    </div>
  );
};

export default ChatSidebar;
