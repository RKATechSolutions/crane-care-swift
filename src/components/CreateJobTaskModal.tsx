import { useState, useEffect } from 'react';
import { X, Phone, Mail, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { mockUsers } from '@/data/mockData';
import { useApp } from '@/contexts/AppContext';

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const JOB_TYPES = [
  { value: 'crane_inspection', label: '🔍 Crane Inspection' },
  { value: 'lifting_inspection', label: '🏗️ Lifting Inspection' },
  { value: 'crane_lifting_inspection', label: '🔍🏗️ Crane & Lifting' },
  { value: 'installation', label: '⚙️ Installation' },
  { value: 'breakdown', label: '🚨 Breakdown' },
  { value: 'repair', label: '🔧 Repair' },
];

interface ClientContact {
  id: string;
  contact_name: string | null;
  contact_given_name: string | null;
  contact_surname: string | null;
  contact_phone: string | null;
  contact_mobile: string | null;
  contact_email: string | null;
  contact_position: string | null;
}

interface Client {
  id: string;
  client_name: string;
  location_address: string | null;
  primary_contact_name: string | null;
  primary_contact_mobile: string | null;
  primary_contact_email: string | null;
}

export function CreateJobTaskModal({ open, onClose, onCreated }: AddTaskModalProps) {
  const { state } = useApp();
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [jobType, setJobType] = useState('crane_inspection');
  const [assignedToId, setAssignedToId] = useState('');
  const [priority, setPriority] = useState('normal');
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [requestedById, setRequestedById] = useState('');
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<ClientContact[]>([]);

  const currentUser = state.currentUser;
  const techs = mockUsers.filter(u => u.role === 'technician');

  const selectedClient = clients.find(c => c.id === clientId);

  const [jobTitle, setJobTitle] = useState('');

  // When client changes, prepopulate the title prefix
  useEffect(() => {
    if (selectedClient) {
      setJobTitle(prev => {
        // If title is empty or was previously set to another client name, reset with new client
        const oldClient = clients.find(c => prev.startsWith(c.client_name));
        if (!prev || (oldClient && oldClient.id !== clientId)) {
          return `${selectedClient.client_name} — `;
        }
        return prev;
      });
    }
  }, [clientId, selectedClient]);


  useEffect(() => {
    if (open) {
      supabase.from('clients').select('id, client_name, location_address, primary_contact_name, primary_contact_mobile, primary_contact_email').eq('status', 'Active').order('client_name').then(({ data }) => {
        if (data) setClients(data);
      });
    }
  }, [open]);

  // Fetch contacts when client changes
  useEffect(() => {
    if (!clientId) { setContacts([]); setRequestedById(''); return; }
    supabase.from('client_contacts').select('id, contact_name, contact_given_name, contact_surname, contact_phone, contact_mobile, contact_email, contact_position').eq('client_id', clientId).eq('status', 'Active').order('contact_name').then(({ data }) => {
      if (data) setContacts(data);
    });
  }, [clientId]);

  const handleSave = async () => {
    if (!jobTitle.trim()) { toast.error('Please add a job title'); return; }
    if (!assignedToId) { toast.error('Please assign to someone'); return; }
    if (!currentUser) { toast.error('Not logged in'); return; }

    const assignee = mockUsers.find(u => u.id === assignedToId);
    const requestedContact = contacts.find(c => c.id === requestedById);
    setSaving(true);

    const { error } = await supabase.from('tasks').insert({
      title: jobTitle.trim(),
      description: [
        description.trim() || null,
        requestedContact ? `Requested by: ${requestedContact.contact_name || `${requestedContact.contact_given_name} ${requestedContact.contact_surname}`}` : null,
        startTime ? `Start: ${startTime}` : null,
        endTime ? `Finish: ${endTime}` : null,
      ].filter(Boolean).join('\n') || null,
      assigned_to_id: assignedToId,
      assigned_to_name: assignee?.name || '',
      created_by_id: currentUser.id,
      created_by_name: currentUser.name,
      priority,
      due_date: scheduledDate || null,
      scheduled_date: scheduledDate || null,
      client_name: selectedClient?.client_name || null,
      job_type: jobType,
    });

    setSaving(false);
    if (error) { toast.error('Failed to create task'); return; }
    toast.success('Task created & added to schedule');
    resetForm();
    onCreated();
    onClose();
  };

  const resetForm = () => {
    setDescription(''); setClientId(''); setJobType('crane_inspection'); setJobTitle('');
    setAssignedToId(''); setPriority('normal'); setScheduledDate('');
    setStartTime(''); setEndTime(''); setRequestedById('');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-background w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-foreground">Create Task</h2>
          <button onClick={onClose} className="p-1"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="space-y-3">
          {/* Client (top) */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Client *</label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client contact info card */}
          {selectedClient && (
            <div className="bg-muted rounded-lg p-3 space-y-1.5">
              {selectedClient.location_address && (
                <p className="text-xs text-muted-foreground">{selectedClient.location_address}</p>
              )}
              {selectedClient.primary_contact_name && (
                <div className="flex items-center gap-1.5 text-xs text-foreground">
                  <UserIcon className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium">{selectedClient.primary_contact_name}</span>
                </div>
              )}
              {selectedClient.primary_contact_mobile && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="w-3 h-3" />
                  <a href={`tel:${selectedClient.primary_contact_mobile}`} className="underline">{selectedClient.primary_contact_mobile}</a>
                </div>
              )}
              {selectedClient.primary_contact_email && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="w-3 h-3" />
                  <a href={`mailto:${selectedClient.primary_contact_email}`} className="underline">{selectedClient.primary_contact_email}</a>
                </div>
              )}
            </div>
          )}

          {/* Requested By (contact) */}
          {clientId && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Requested By</label>
              <Select value={requestedById} onValueChange={setRequestedById}>
                <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                <SelectContent>
                  {contacts.length === 0 ? (
                    <SelectItem value="__none" disabled>No contacts found</SelectItem>
                  ) : (
                    contacts.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.contact_name || `${c.contact_given_name || ''} ${c.contact_surname || ''}`.trim() || 'Unnamed'}
                        {c.contact_position ? ` (${c.contact_position})` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Job Type */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Job Type *</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {JOB_TYPES.map(jt => (
                <button
                  key={jt.value}
                  onClick={() => setJobType(jt.value)}
                  className={`p-2 rounded-lg border-2 text-xs font-medium transition-all ${
                    jobType === jt.value ? 'border-primary bg-primary/10' : 'border-border bg-background'
                  }`}
                >
                  {jt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Editable Job Title */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Job Title *</label>
            <Input
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              placeholder="e.g. Client Name — Repair of Crane 1"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Task details, notes..."
              rows={3}
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm resize-none"
            />
          </div>

          {/* Assign To */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Assign To *</label>
            <Select value={assignedToId} onValueChange={setAssignedToId}>
              <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
              <SelectContent>
                {techs.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} {u.id === currentUser?.id ? '(You)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority + Date */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground">Scheduled Date</label>
              <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
            </div>
          </div>

          {/* Start & Finish Times */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground">Start Time</label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground">Finish Time</label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Creating...' : 'Create Task'}
        </Button>
      </div>
    </div>
  );
}
