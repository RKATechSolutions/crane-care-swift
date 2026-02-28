import { useState } from 'react';
import { X } from 'lucide-react';
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

export function AddTaskModal({ open, onClose, onCreated }: AddTaskModalProps) {
  const { state } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [priority, setPriority] = useState('normal');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const currentUser = state.currentUser;
  const techs = mockUsers.filter(u => u.role === 'technician');

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!assignedToId) { toast.error('Please assign to someone'); return; }
    if (!currentUser) { toast.error('Not logged in'); return; }

    const assignee = mockUsers.find(u => u.id === assignedToId);
    setSaving(true);

    const { error } = await supabase.from('tasks').insert({
      title: title.trim(),
      description: description.trim() || null,
      assigned_to_id: assignedToId,
      assigned_to_name: assignee?.name || '',
      created_by_id: currentUser.id,
      created_by_name: currentUser.name,
      priority,
      due_date: dueDate || null,
    });

    setSaving(false);
    if (error) { toast.error('Failed to create task'); return; }
    toast.success('Task created');
    setTitle(''); setDescription(''); setAssignedToId(''); setPriority('normal'); setDueDate('');
    onCreated();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-background w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-foreground">New Task</h2>
          <button onClick={onClose} className="p-1"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Title *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Follow up with client" />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional details..."
              rows={3}
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm resize-none"
            />
          </div>

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
              <label className="text-xs font-semibold text-muted-foreground">Due Date</label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
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
