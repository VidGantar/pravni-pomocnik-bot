import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HeadphonesIcon, Loader2 } from 'lucide-react';

interface SupportUser {
  user_id: string;
  full_name: string | null;
  email: string | null;
  department: string | null;
}

interface ContactSupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (supportUserId: string) => void;
  suggestedDepartment?: string | null;
}

const ContactSupportDialog: React.FC<ContactSupportDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  suggestedDepartment,
}) => {
  const [supportUsers, setSupportUsers] = useState<SupportUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      // Get all support user IDs
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'support');

      if (!roles || roles.length === 0) {
        setLoading(false);
        return;
      }

      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, department')
        .in('user_id', userIds);

      if (profiles) {
        setSupportUsers(profiles as SupportUser[]);

        // Auto-select best match based on suggested department
        const defaultUser = profiles.find(p => p.email === 'splosna-podpora@dodv.gov.si');
        let bestMatch: SupportUser | undefined;

        if (suggestedDepartment) {
          const dept = suggestedDepartment.toLowerCase();
          bestMatch = profiles.find(p =>
            p.department && p.department.toLowerCase().includes(dept)
          );
        }

        setSelectedUserId(
          bestMatch?.user_id || defaultUser?.user_id || profiles[0]?.user_id || ''
        );
      }
      setLoading(false);
    };
    load();
  }, [open, suggestedDepartment]);

  const selectedUser = supportUsers.find(u => u.user_id === selectedUserId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeadphonesIcon className="h-5 w-5 text-primary" />
            Kontaktiraj podporo
          </DialogTitle>
          <DialogDescription>
            Izberite podporno službo, ki ji želite posredovati vaše vprašanje.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Podporna služba</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Izberite podporno službo">
                    {selectedUser ? (selectedUser.full_name || selectedUser.email) : 'Izberite podporno službo'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {supportUsers.map(u => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      <div className="flex flex-col">
                        <span>{u.full_name || u.email}</span>
                        {u.department && (
                          <span className="text-xs text-muted-foreground">
                            Področje: {u.department}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {suggestedDepartment && (
              <p className="rounded-md bg-accent/50 px-3 py-2 text-xs text-accent-foreground">
                🤖 AI predlog: <span className="font-medium">{suggestedDepartment}</span>
              </p>
            )}

            <Button
              onClick={() => onConfirm(selectedUserId)}
              className="w-full gap-2"
              disabled={!selectedUserId}
            >
              <HeadphonesIcon className="h-4 w-4" />
              Pošlji zahtevo
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ContactSupportDialog;
