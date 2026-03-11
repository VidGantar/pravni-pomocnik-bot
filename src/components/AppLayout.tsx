import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageCircle, FileText, LayoutDashboard, HeadphonesIcon, LogOut, Shield, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, role, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/prijava" replace />;

  const navItems = [
    { path: '/', label: 'Klepet', icon: MessageCircle, roles: ['user', 'admin', 'support'] },
    { path: '/dokumenti', label: 'Dokumenti', icon: FileText, roles: ['user', 'admin', 'support'] },
    { path: '/podpora', label: 'Moje zahteve', icon: HeadphonesIcon, roles: ['support'] },
    { path: '/nadzorna', label: 'Nadzorna plošča', icon: LayoutDashboard, roles: ['admin'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(role));

  const roleLabel = role === 'admin' ? 'Administrator' : role === 'support' ? 'Podpora' : 'Uporabnik';

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary">
            <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-sidebar-foreground">DOdv</h1>
            <p className="text-xs text-sidebar-foreground/60">Pomočnik</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {filteredNav.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                location.pathname === item.path
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-sidebar-border px-3 py-4">
          <div className="mb-3 flex items-center gap-3 px-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent">
              <User className="h-4 w-4 text-sidebar-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {profile?.username || 'Uporabnik'}
              </p>
              <p className="text-xs text-sidebar-foreground/50">{roleLabel}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Odjava
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
