import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { HeadphonesIcon, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface TicketRow {
  id: string;
  subject: string;
  description: string;
  status: string;
  category: string;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
  user_id: string;
  conversation_id: string | null;
}

const SupportDashboard = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [resolveTicket, setResolveTicket] = useState<TicketRow | null>(null);
  const [resolution, setResolution] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadTickets();
  }, [user]);

  const loadTickets = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .eq('assigned_to', user.id)
      .order('created_at', { ascending: false });
    if (data) setTickets(data as TicketRow[]);
  };

  const handleResolve = async () => {
    if (!resolveTicket || !resolution.trim()) {
      toast.error('Vnesite rešitev');
      return;
    }
    if (isResolving) return;
    setIsResolving(true);

    try {
    // Update ticket
    await supabase
      .from('tickets')
      .update({
        status: 'resolved',
        resolution,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', resolveTicket.id);

    // Update conversation status
    if (resolveTicket.conversation_id) {
      await supabase
        .from('conversations')
        .update({ status: 'resolved_support' })
        .eq('id', resolveTicket.conversation_id);

      // Add resolution message to conversation
      await supabase
        .from('messages')
        .insert({
          conversation_id: resolveTicket.conversation_id,
          role: 'support',
          content: `✅ Rešitev: ${resolution}`,
        });
    }

    // Save to FAQ for future reference
    await supabase.from('faq_entries').insert({
      question: resolveTicket.subject,
      answer: resolution,
      category: resolveTicket.category,
    });

    // Append to "Pretekla vprašanja" document using AI summary from description
    const { data: pastDoc } = await supabase
      .from('documents')
      .select('id, content')
      .eq('category', 'pretekla-vprasanja')
      .single();

    if (pastDoc) {
      const date = new Date().toLocaleDateString('sl-SI');
      const summary = resolveTicket.description || resolveTicket.subject;
      const entry = `\n**${date} — ${resolveTicket.category}**\n**Vprašanje:** ${resolveTicket.subject}\n**Povzetek:** ${summary}\n**Rešitev:** ${resolution}\n\n---\n`;
      await supabase
        .from('documents')
        .update({ content: pastDoc.content + entry })
        .eq('id', pastDoc.id);
    }

    } finally {
      setIsResolving(false);
    }
    setResolveTicket(null);
    setResolution('');
    loadTickets();
  };

  const pending = tickets.filter(t => t.status !== 'resolved');
  const resolved = tickets.filter(t => t.status === 'resolved');

  return (
    <AppLayout>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-card px-6 py-4">
          <HeadphonesIcon className="h-5 w-5 text-primary" />
          <h1 className="font-display text-lg font-semibold text-foreground">Moje zahteve</h1>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6">
            <Tabs defaultValue="pending">
              <TabsList>
                <TabsTrigger value="pending" className="gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Odprte ({pending.length})
                </TabsTrigger>
                <TabsTrigger value="resolved" className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Rešene ({resolved.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="mt-4 space-y-2">
                {pending.map(ticket => (
                  <Card key={ticket.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{ticket.subject}</p>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{ticket.description}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant="outline" className="bg-pending/10 text-pending border-pending/20">
                              {ticket.status === 'in_progress' ? 'V delu' : 'Čakajoč'}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">{ticket.category}</Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(ticket.created_at).toLocaleDateString('sl-SI')}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-1 border-success/30 text-success hover:bg-success/10"
                          onClick={() => setResolveTicket(ticket)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Reši
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {pending.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">Ni odprtih zahtev</p>
                )}
              </TabsContent>

              <TabsContent value="resolved" className="mt-4 space-y-2">
                {resolved.map(ticket => (
                  <Card key={ticket.id} className="border-success/10 bg-success/5">
                    <CardContent className="p-4">
                      <p className="text-sm font-medium text-foreground">{ticket.subject}</p>
                      {ticket.resolution && (
                        <p className="mt-1 text-xs text-success">✅ {ticket.resolution}</p>
                      )}
                      <span className="mt-2 block text-[10px] text-muted-foreground">
                        Rešeno {ticket.resolved_at ? new Date(ticket.resolved_at).toLocaleDateString('sl-SI') : ''}
                      </span>
                    </CardContent>
                  </Card>
                ))}
                {resolved.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">Ni rešenih zahtev</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        {/* Resolve dialog */}
        <Dialog open={!!resolveTicket} onOpenChange={open => !open && setResolveTicket(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reši zahtevo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground">{resolveTicket?.subject}</p>
                <p className="mt-1 text-xs text-muted-foreground">{resolveTicket?.description}</p>
              </div>
              <div>
                <Label>Rešitev</Label>
                <Textarea
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                  placeholder="Opišite rešitev..."
                  rows={4}
                />
              </div>
              <Button onClick={handleResolve} className="w-full gap-2" disabled={isResolving}>
                <CheckCircle2 className="h-4 w-4" />
                {isResolving ? 'Reševanje...' : 'Označi kot rešeno'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default SupportDashboard;
