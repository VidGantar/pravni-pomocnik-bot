import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  LayoutDashboard, Users, Ticket, AlertCircle, CheckCircle2,
  UserPlus, Trash2,
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

const AdminDashboard = () => {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', username: '', role: 'user' as string });
  const [deleteTicketId, setDeleteTicketId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [ticketsRes, profilesRes] = await Promise.all([
      supabase.from('tickets').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
    ]);
    if (ticketsRes.data) setTickets(ticketsRes.data as TicketRow[]);
    if (profilesRes.data) setProfiles(profilesRes.data as ProfileRow[]);
  };

  const handleDeleteTicket = async () => {
    if (!deleteTicketId) return;
    const ticket = tickets.find(t => t.id === deleteTicketId);
    if (ticket?.conversation_id) {
      await supabase.from('messages').delete().eq('conversation_id', ticket.conversation_id);
      await supabase.from('conversations').delete().eq('id', ticket.conversation_id);
    }
    await supabase.from('tickets').delete().eq('id', deleteTicketId);
    setTickets(prev => prev.filter(t => t.id !== deleteTicketId));
    setDeleteTicketId(null);
    toast.success('Zahteva je bila izbrisana');
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

  const getProfileName = (userId: string | null) => {
    if (!userId) return '—';
    const p = profiles.find(pr => pr.user_id === userId);
    return p?.username || p?.email || '—';
  };

  const pendingCount = tickets.filter(t => t.status !== 'resolved').length;
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
            <div className="grid grid-cols-2 gap-4">
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
                <TabsTrigger value="users" className="gap-2">
                  <Users className="h-4 w-4" />
                  Uporabniki ({profiles.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tickets" className="mt-4">
                <Card className="border-border/50">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Zadeva</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Podpora</TableHead>
                        <TableHead>Uporabnik</TableHead>
                        <TableHead>Datum</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tickets.map(ticket => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-medium">{ticket.subject}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                ticket.status === 'resolved'
                                  ? 'bg-success/10 text-success border-success/20'
                                  : 'bg-pending/10 text-pending border-pending/20'
                              }
                            >
                              {ticket.status === 'resolved' ? 'Rešen' : 'Čakajoč'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {getProfileName(ticket.assigned_to)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {getProfileName(ticket.user_id)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(ticket.created_at).toLocaleDateString('sl-SI')}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setDeleteTicketId(ticket.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {tickets.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                            Ni zahtev
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>
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

        <AlertDialog open={!!deleteTicketId} onOpenChange={open => !open && setDeleteTicketId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Izbriši zahtevo?</AlertDialogTitle>
              <AlertDialogDescription>
                Zahteva in pripadajoč pogovor bosta trajno izbrisana. Tega dejanja ni mogoče razveljaviti.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Prekliči</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTicket} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Izbriši
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
