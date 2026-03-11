import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Plus, Search, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

interface Document {
  id: string;
  title: string;
  content: string;
  category: string;
  file_url: string | null;
  created_at: string;
}

const categories = ['splošno', 'IT podpora', 'dokumentarni sistem', 'kadrovske zadeve', 'pravni temelji', 'navodila'];

const DocumentsPage = () => {
  const { role } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', content: '', category: 'splošno' });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setDocuments(data as Document[]);
  };

  const handleAddDocument = async () => {
    if (!newDoc.title.trim() || !newDoc.content.trim()) {
      toast.error('Izpolnite naslov in vsebino');
      return;
    }
    const { error } = await supabase.from('documents').insert({
      title: newDoc.title,
      content: newDoc.content,
      category: newDoc.category,
    });
    if (error) {
      toast.error('Napaka pri dodajanju dokumenta');
      return;
    }
    toast.success('Dokument uspešno dodan');
    setShowAddDialog(false);
    setNewDoc({ title: '', content: '', category: 'splošno' });
    loadDocuments();
  };

  const filtered = documents.filter(d => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.content.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === 'all' || d.category === filterCategory;
    return matchSearch && matchCategory;
  });

  return (
    <AppLayout>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="font-display text-lg font-semibold text-foreground">Dokumenti</h1>
          </div>
          {role === 'admin' && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Dodaj dokument
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Nov dokument</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Naslov</Label>
                    <Input
                      value={newDoc.title}
                      onChange={e => setNewDoc(p => ({ ...p, title: e.target.value }))}
                      placeholder="Naziv dokumenta"
                    />
                  </div>
                  <div>
                    <Label>Kategorija</Label>
                    <Select value={newDoc.category} onValueChange={v => setNewDoc(p => ({ ...p, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Vsebina</Label>
                    <Textarea
                      value={newDoc.content}
                      onChange={e => setNewDoc(p => ({ ...p, content: e.target.value }))}
                      placeholder="Vsebina dokumenta..."
                      rows={8}
                    />
                  </div>
                  <Button onClick={handleAddDocument} className="w-full">Shrani dokument</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-3 border-b border-border bg-card px-6 py-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Išči dokumente..."
              className="pl-9"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Kategorija" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Vse kategorije</SelectItem>
              {categories.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          <ScrollArea className="w-96 border-r border-border">
            <div className="space-y-2 p-4">
              {filtered.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedDoc?.id === doc.id
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{doc.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">{doc.category}</Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString('sl-SI')}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Ni najdenih dokumentov
                </p>
              )}
            </div>
          </ScrollArea>

          {/* Document preview */}
          <div className="flex-1 overflow-auto p-6">
            {selectedDoc ? (
              <div className="mx-auto max-w-3xl animate-fade-in">
                <div className="mb-4 flex items-center gap-2">
                  <Badge variant="secondary">{selectedDoc.category}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(selectedDoc.created_at).toLocaleDateString('sl-SI')}
                  </span>
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground">{selectedDoc.title}</h2>
                <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                  {selectedDoc.content}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center">
                <div>
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 text-muted-foreground">Izberite dokument za ogled</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DocumentsPage;
