
-- Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'support', 'user');

-- User roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    full_name TEXT,
    email TEXT,
    department TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Documents table (knowledge base)
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'splošno',
    file_url TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- FAQ entries
CREATE TABLE public.faq_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'splošno',
    source_document_id UUID REFERENCES public.documents(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.faq_entries ENABLE ROW LEVEL SECURITY;

-- Conversations
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL DEFAULT 'Nov pogovor',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_support', 'resolved_chat', 'resolved_support')),
    assigned_to UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Messages
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'support')),
    content TEXT NOT NULL,
    sources JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Tickets
CREATE TABLE public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    assigned_to UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    resolution TEXT,
    category TEXT NOT NULL DEFAULT 'splošno',
    related_ticket_id UUID REFERENCES public.tickets(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- profiles
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- documents
CREATE POLICY "Documents viewable by authenticated" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage documents" ON public.documents FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- faq_entries
CREATE POLICY "FAQ viewable by authenticated" ON public.faq_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage FAQ" ON public.faq_entries FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- conversations
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Support can view assigned conversations" ON public.conversations FOR SELECT USING (public.has_role(auth.uid(), 'support') AND assigned_to = auth.uid());
CREATE POLICY "Support can update assigned conversations" ON public.conversations FOR UPDATE USING (public.has_role(auth.uid(), 'support') AND assigned_to = auth.uid());
CREATE POLICY "Admins can manage all conversations" ON public.conversations FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- messages
CREATE POLICY "Users can view messages in own convos" ON public.messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can create messages in own convos" ON public.messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));
CREATE POLICY "Support can view messages in assigned convos" ON public.messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.assigned_to = auth.uid()) AND public.has_role(auth.uid(), 'support'));
CREATE POLICY "Support can create messages in assigned convos" ON public.messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.assigned_to = auth.uid()) AND public.has_role(auth.uid(), 'support'));
CREATE POLICY "Admins can manage all messages" ON public.messages FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- tickets
CREATE POLICY "Users can view own tickets" ON public.tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create tickets" ON public.tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Support can view assigned tickets" ON public.tickets FOR SELECT USING (public.has_role(auth.uid(), 'support') AND assigned_to = auth.uid());
CREATE POLICY "Support can update assigned tickets" ON public.tickets FOR UPDATE USING (public.has_role(auth.uid(), 'support') AND assigned_to = auth.uid());
CREATE POLICY "Admins can manage all tickets" ON public.tickets FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, username, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', NEW.email), NEW.email);
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'user'));
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
