import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import ChatSidebar from '@/components/ChatSidebar';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import TypingIndicator from '@/components/TypingIndicator';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HeadphonesIcon, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'support';
  content: string;
  sources?: unknown;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const ChatPage = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showContactSupport, setShowContactSupport] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (data) setConversations(data as Conversation[]);
    };
    load();
  }, [user]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }
    const load = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConvId)
        .order('created_at', { ascending: true });
      if (data) setMessages(data as unknown as Message[]);
    };
    load();
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const createConversation = async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title: 'Nov pogovor' })
      .select()
      .single();
    if (error) {
      toast.error('Napaka pri ustvarjanju pogovora');
      return null;
    }
    const conv = data as Conversation;
    setConversations(prev => [conv, ...prev]);
    setActiveConvId(conv.id);
    setMessages([]);
    setShowContactSupport(false);
    return conv;
  };

  const handleSend = async (content: string) => {
    if (!user) return;

    let convId = activeConvId;
    if (!convId) {
      const conv = await createConversation();
      if (!conv) return;
      convId = conv.id;
    }

    // Save user message
    const { data: userMsg } = await supabase
      .from('messages')
      .insert({ conversation_id: convId, role: 'user', content })
      .select()
      .single();

    if (userMsg) {
      setMessages(prev => [...prev, userMsg as unknown as Message]);
    }

    // Update conversation title if first message
    if (messages.length === 0) {
      const title = content.slice(0, 60) + (content.length > 60 ? '...' : '');
      await supabase
        .from('conversations')
        .update({ title })
        .eq('id', convId);
      setConversations(prev =>
        prev.map(c => c.id === convId ? { ...c, title } : c)
      );
    }

    // Call AI edge function
    setIsTyping(true);
    setShowContactSupport(false);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('chat', {
        body: {
          message: content,
          conversation_id: convId,
          history: [...messages, { role: 'user', content }].map(m => ({
            role: m.role === 'support' ? 'assistant' : m.role,
            content: m.content,
          })),
        },
      });

      if (fnError) throw fnError;

      const assistantContent = fnData?.reply || 'Oprostite, nisem mogel obdelati vašega vprašanja.';
      const sources = fnData?.sources || null;
      const canAnswer = fnData?.can_answer !== false;

      // Save assistant message
      const { data: assistantMsg } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          role: 'assistant',
          content: assistantContent,
          sources: sources ? JSON.stringify(sources) : null,
        })
        .select()
        .single();

      if (assistantMsg) {
        setMessages(prev => [...prev, {
          ...(assistantMsg as unknown as Message),
          sources: sources,
        }]);
      }

      if (!canAnswer) {
        setShowContactSupport(true);
      }
    } catch (err) {
      console.error('Chat error:', err);
      // Fallback: simulate response based on content
      const fallbackReply = generateFallbackReply(content);
      const { data: assistantMsg } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          role: 'assistant',
          content: fallbackReply.reply,
          sources: fallbackReply.sources ? JSON.stringify(fallbackReply.sources) : null,
        })
        .select()
        .single();

      if (assistantMsg) {
        setMessages(prev => [...prev, {
          ...(assistantMsg as unknown as Message),
          sources: fallbackReply.sources,
        }]);
      }

      if (!fallbackReply.canAnswer) {
        setShowContactSupport(true);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleContactSupport = async () => {
    if (!activeConvId || !user) return;

    // Update conversation status
    await supabase
      .from('conversations')
      .update({ status: 'pending_support' })
      .eq('id', activeConvId);

    // Create ticket
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    await supabase
      .from('tickets')
      .insert({
        conversation_id: activeConvId,
        user_id: user.id,
        subject: lastUserMsg?.content.slice(0, 100) || 'Zahteva za podporo',
        description: messages.map(m => `${m.role}: ${m.content}`).join('\n\n'),
        category: 'splošno',
      });

    setConversations(prev =>
      prev.map(c => c.id === activeConvId ? { ...c, status: 'pending_support' } : c)
    );

    setShowContactSupport(false);
    toast.success('Zahteva za podporo je bila poslana. Podpora se bo oglasila.');

    // Add system message
    const { data: sysMsg } = await supabase
      .from('messages')
      .insert({
        conversation_id: activeConvId,
        role: 'assistant',
        content: '📋 Vaša zahteva je bila posredovana podporni službi. Obvestili vas bomo, ko bo rešena.',
      })
      .select()
      .single();

    if (sysMsg) setMessages(prev => [...prev, sysMsg as Message]);
  };

  const activeConv = conversations.find(c => c.id === activeConvId);
  const isResolved = activeConv?.status?.startsWith('resolved');

  return (
    <AppLayout>
      <div className="flex h-full">
        <ChatSidebar
          conversations={conversations}
          activeId={activeConvId}
          onSelect={setActiveConvId}
          onNew={() => { setActiveConvId(null); setMessages([]); setShowContactSupport(false); }}
        />

        <div className="flex flex-1 flex-col">
          {/* Chat header */}
          <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              <h2 className="font-display text-sm font-semibold text-foreground">
                {activeConv?.title || 'Nov pogovor'}
              </h2>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="mx-auto max-w-3xl space-y-4">
              {messages.length === 0 && !activeConvId && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
                    <MessageCircle className="h-8 w-8 text-accent-foreground" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-foreground">
                    Kako vam lahko pomagam?
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    Zastavite vprašanje o IT podpori, dokumentarnem sistemu, kadrovskih zadevah ali splošnih organizacijskih vprašanjih.
                  </p>
                </div>
              )}

              {messages.map(msg => (
                <ChatMessage
                  key={msg.id}
                  role={msg.role as 'user' | 'assistant' | 'support'}
                  content={msg.content}
                  sources={typeof msg.sources === 'string' ? JSON.parse(msg.sources) : msg.sources || undefined}
                  timestamp={msg.created_at}
                />
              ))}

              {isTyping && <TypingIndicator />}

              {showContactSupport && !isResolved && (
                <div className="flex justify-center animate-fade-in">
                  <Button
                    onClick={handleContactSupport}
                    variant="outline"
                    className="gap-2 border-pending/30 text-pending hover:bg-pending/10"
                  >
                    <HeadphonesIcon className="h-4 w-4" />
                    Kontaktiraj podporo
                  </Button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          {!isResolved ? (
            <ChatInput
              onSend={handleSend}
              disabled={isTyping || activeConv?.status === 'pending_support'}
              placeholder={
                activeConv?.status === 'pending_support'
                  ? 'Čakate na odgovor podpore...'
                  : 'Vnesite vaše vprašanje...'
              }
            />
          ) : (
            <div className="border-t border-border bg-success/5 px-6 py-3 text-center text-sm text-success">
              ✓ Ta pogovor je bil rešen
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

// Fallback when edge function is not available
function generateFallbackReply(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes('feniks') || lower.includes('odprema') || lower.includes('dokument')) {
    return {
      reply: 'Za odpremo dokumentov v IS Feniks sledite naslednjim korakom:\n\n1. Odprite zadevo v IS Feniks\n2. Izberite dokument za odpremo\n3. Kliknite "Odprema" in izberite ciljni organ\n4. Potrdite odpremo\n\nČe naletite na tehnično napako, vam svetujem, da kontaktirate podporo.',
      sources: [{ title: 'Navodila za generični servis za izmenjavo dokumentov', excerpt: 'Postopek odpreme dokumentov' }],
      canAnswer: true,
    };
  }

  if (lower.includes('temelj') || lower.includes('šifra') || lower.includes('vsebinska oznaka')) {
    return {
      reply: 'Za ustvarjanje novega pravnega temelja v IS Feniks:\n\n1. Preverite, ali ustrezen temelj že obstaja v seznamu temeljev\n2. Če ne obstaja, pripravite predlog z opisom vsebine\n3. Predlog pošljite Uradu generalnega državnega odvetnika\n4. Urad bo potrdil ali zavrnil predlog\n\nAli želite, da preverim obstoječe temelje?',
      sources: [{ title: 'Izpis temeljev', excerpt: 'Seznam obstoječih pravnih temeljev' }],
      canAnswer: true,
    };
  }

  if (lower.includes('dopust') || lower.includes('dovolilnica') || lower.includes('par') || lower.includes('nadomest')) {
    return {
      reply: 'Postopek za odobritev letnega dopusta:\n\n1. Izpolnite dovolilnico za dopust\n2. Pridobite soglasje vodje\n3. Pridobite soglasje nadomestne osebe (par)\n\nČe je vaš par odsoten, se obrnite na vodjo, ki vam bo dodelil začasno nadomestno osebo.',
      sources: [{ title: 'Pogosta vprašanja - kadrovske zadeve', excerpt: 'Postopek odobritve dopusta' }],
      canAnswer: true,
    };
  }

  if (lower.includes('geslo') || lower.includes('prijava') || lower.includes('dostop') || lower.includes('it')) {
    return {
      reply: 'Za ponastavitev gesla ali težave z dostopom:\n\n1. Poskusite ponastaviti geslo preko portala za samopostrežbo\n2. Če to ne deluje, kontaktirajte Službo za informatiko\n\nAli imate drugačno IT težavo?',
      sources: [{ title: 'IT podpora - pogosta vprašanja', excerpt: 'Ponastavitev gesla in dostopi' }],
      canAnswer: true,
    };
  }

  return {
    reply: 'Hvala za vaše vprašanje. Žal v trenutnih gradivih nisem našel dovolj natančnega odgovora. Priporočam, da kontaktirate podporno službo, ki vam bo lahko pomagala.',
    sources: null,
    canAnswer: false,
  };
}

export default ChatPage;
