import React from 'react';
import { Bot } from 'lucide-react';

const TypingIndicator: React.FC = () => (
  <div className="flex gap-3 animate-fade-in">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent">
      <Bot className="h-4 w-4 text-accent-foreground" />
    </div>
    <div className="rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3">
      <div className="flex gap-1">
        <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: '0s' }} />
        <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: '0.2s' }} />
        <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  </div>
);

export default TypingIndicator;
