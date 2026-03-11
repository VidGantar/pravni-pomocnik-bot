import React from 'react';
import { cn } from '@/lib/utils';
import { Bot, User, HeadphonesIcon } from 'lucide-react';
import { renderMarkdown } from '@/lib/renderMarkdown';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Source {
  title: string;
  excerpt?: string;
}

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'support';
  content: string;
  sources?: Source[];
  timestamp?: string;
}

// Parse [[name||email||dept]] markup then render markdown
const renderContent = (text: string) => {
  const regex = /\[\[(.+?)\|\|(.+?)\|\|(.+?)\]\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(...renderMarkdown(text.slice(lastIndex, match.index)));
    }
    const [, name, email, dept] = match;
    parts.push(
      <TooltipProvider key={match.index}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="font-semibold text-primary underline decoration-dotted cursor-help">
              {name}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs space-y-0.5">
            {email && <p>📧 {email}</p>}
            {dept && <p>🏢 {dept}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(...renderMarkdown(text.slice(lastIndex)));
  }

  return parts.length > 0 ? parts : renderMarkdown(text);
};

const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, sources, timestamp }) => {
  const isUser = role === 'user';
  const isSupport = role === 'support';

  return (
    <div className={cn('flex gap-3 animate-fade-in', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
        isUser ? 'bg-primary' : isSupport ? 'bg-success' : 'bg-accent'
      )}>
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : isSupport ? (
          <HeadphonesIcon className="h-4 w-4 text-success-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-accent-foreground" />
        )}
      </div>

      <div className={cn('max-w-[70%] space-y-2', isUser ? 'items-end' : 'items-start')}>
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : isSupport
              ? 'bg-success/10 text-foreground border border-success/20 rounded-bl-md'
              : 'bg-card text-foreground border border-border rounded-bl-md'
        )}>
          <p className="whitespace-pre-wrap">{renderContent(content)}</p>
        </div>

        {sources && sources.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Viri:</p>
            {sources.map((s, i) => (
              <button
                key={i}
                className="block w-full rounded-lg border border-border bg-card px-3 py-1.5 text-left text-xs text-primary hover:bg-accent transition-colors"
              >
                📄 {s.title}
                {s.excerpt && <span className="block mt-0.5 text-muted-foreground">{s.excerpt}</span>}
              </button>
            ))}
          </div>
        )}

        {timestamp && (
          <p className="text-[10px] text-muted-foreground">
            {new Date(timestamp).toLocaleString('sl-SI')}
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
