import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  LayoutDashboard, Users, Ticket, AlertCircle, CheckCircle2, Clock,
  UserPlus, Trash2, MessageCircle,
} from 'lucide-react';
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
  assigned_to: string | null;
  conversation_id: string | null;
}

interface ProfileRow {
  id: string;
  user_id: string;
  username: string;
  email: string | null;
  department: string | null;
}

interface ConversationRow {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: 'Čakajoč', icon: AlertCircle, color: 'bg-pending/10 text-pending border-pending/20' },
  in_progress: { label: 'V delu', icon: Clock, color: 'bg-primary/10 text-primary border-primary/20' },
  resolved: { label: 'Rešen', icon: CheckCircle2, color: 'bg-success/10 text-success border-success/20' },
};

const AdminDashboard = () => {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', username: '', role: 'user' as string });
  const [deleteConvId, setDeleteConvId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [ticketsRes, profilesRes, convsRes] = await Promise.all([
      supabase.from('tickets').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
      supabase.from('conversations').select('*')
        .in('status', ['pending_support', 'resolved_support'])
        .order('updated_at', { ascending: false }),
    ]);
    if (ticketsRes.data) setTickets(ticketsRes.data as TicketRow[]);
    if (profilesRes.data) setProfiles(profilesRes.data as ProfileRow[]);
    if (convsRes.data) setConversations(convsRes.data as ConversationRow[]);
  };

  const handleDeleteConversation = async () => {
    if (!deleteConvId) return;
    // Delete messages first, then conversation
    await supabase.from('messages').delete().eq('conversation_id', deleteConvId);
    await supabase.from('tickets').delete().eq('conversation_id', deleteConvId);
    await supabase.from('conversations').delete().eq('id', deleteConvId);
    setConversations(prev => prev.filter(c => c.id !== deleteConvId));
    setDeleteConvId(null);
    toast.success('Pogovor je bil izbrisan');
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.username) {
      toast.error('Izpolnite vsa polja');
      return;
    }
    const { error } = await supabase.auth.signUp({
      email: newUser.email,
      password: newUser.password,
      options: {
        data: { username: newUser.username, role: newUser.role },
      },
    });
    if (error) {
      toast.error('Napaka: ' + error.message);
      return;
    }
    toast.success('Uporabnik ustvarjen');
    setShowAddUser(false);
    setNewUser({ email: '', password: '', username: '', role: 'user' });
    setTimeout(loadData, 1000);
  };

  const pendingCount = tickets.filter(t => t.status === 'pending').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length;

  return (
    <AppLayout>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <h1 className="font-display text-lg font-semibold text-foreground">Nadzorna plošča</h1>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-6 p-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-pending/20">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pending/10">
                    <AlertCircle className="h-6 w-6 text-pending" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
                    <p className="text-sm text-muted-foreground">Čakajoči</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-primary/20">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{inProgressCount}</p>
                    <p className="text-sm text-muted-foreground">V delu</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-success/20">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{resolvedCount}</p>
                    <p className="text-sm text-muted-foreground">Rešeni</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="tickets">
              <TabsList>
                <TabsTrigger value="tickets" className="gap-2">
                  <Ticket className="h-4 w-4" />
                  Zahteve ({tickets.length})
                </TabsTrigger>
              <TabsTrigger value="conversations" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Pogovori ({conversations.length})
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-2">
                  <Users className="h-4 w-4" />
                  Uporabniki ({profiles.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tickets" className="mt-4">
                <div className="space-y-2">
                  {tickets.map(ticket => {
                    const config = statusConfig[ticket.status] || statusConfig.pending;
                    const StatusIcon = config.icon;
                    return (
                      <Card key={ticket.id} className="border-border/50">
                        <CardContent className="flex items-center gap-4 p-4">
                          <StatusIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{ticket.subject}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <Badge variant="outline" className={config.color}>
                                {config.label}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px]">{ticket.category}</Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(ticket.created_at).toLocaleDateString('sl-SI')}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {tickets.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">Ni zahtev</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="users" className="mt-4">
                <div className="mb-4">
                  <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
                    <Button size="sm" className="gap-2" onClick={() => setShowAddUser(true)}>
                      <UserPlus className="h-4 w-4" />
                      Dodaj uporabnika
                    </Button>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nov uporabnik</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Uporabniško ime</Label>
                          <Input value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} />
                        </div>
                        <div>
                          <Label>E-pošta</Label>
                          <Input type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
                        </div>
                        <div>
                          <Label>Geslo</Label>
                          <Input type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
                        </div>
                        <div>
                          <Label>Vloga</Label>
                          <Select value={newUser.role} onValueChange={v => setNewUser(p => ({ ...p, role: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Uporabnik</SelectItem>
                              <SelectItem value="support">Podpora</SelectItem>
                              <SelectItem value="admin">Administrator</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={handleAddUser} className="w-full">Ustvari uporabnika</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="space-y-2">
                  {profiles.map(p => (
                    <Card key={p.id} className="border-border/50">
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent">
                          <Users className="h-4 w-4 text-accent-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.username}</p>
                          <p className="text-xs text-muted-foreground">{p.email || 'Ni e-pošte'}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
