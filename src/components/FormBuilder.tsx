import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TemplateItemType, TemplateItem } from '@/types/inspection';
import { Plus, ChevronRight, CheckSquare, List, Hash, Trash2, Calendar, Type, Camera, ToggleLeft, Pencil, X, Save } from 'lucide-react';

export default function FormBuilder() {
  const { state, dispatch } = useApp();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<TemplateItem | null>(null);

  // Form state (shared for add + edit)
  const [formLabel, setFormLabel] = useState('');
  const [formType, setFormType] = useState<TemplateItemType>('checklist');
  const [formOptions, setFormOptions] = useState('');
  const [formConditionalOn, setFormConditionalOn] = useState('');

  const selectedTemplate = state.templates.find(t => t.id === selectedTemplateId);
  const selectedSection = selectedTemplate?.sections.find(s => s.id === selectedSectionId);

  const typeConfig: { value: TemplateItemType; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: 'checklist', label: 'Checklist', icon: <CheckSquare className="w-5 h-5" />, desc: 'Pass / Defect toggle' },
    { value: 'single_select', label: 'Single Select', icon: <List className="w-5 h-5" />, desc: 'Tap-to-select buttons' },
    { value: 'yes_no_na', label: 'Yes / No / N/A', icon: <ToggleLeft className="w-5 h-5" />, desc: 'Quick 3-option select' },
    { value: 'numeric', label: 'Numeric', icon: <Hash className="w-5 h-5" />, desc: 'Number input field' },
    { value: 'date', label: 'Date', icon: <Calendar className="w-5 h-5" />, desc: 'Date picker' },
    { value: 'text', label: 'Text / Notes', icon: <Type className="w-5 h-5" />, desc: 'Free-text input' },
    { value: 'photo_required', label: 'Photo Required', icon: <Camera className="w-5 h-5" />, desc: 'Mandatory photo capture' },
  ];

  const resetForm = () => {
    setFormLabel('');
    setFormType('checklist');
    setFormOptions('');
    setFormConditionalOn('');
    setShowAddForm(false);
    setEditingItem(null);
  };

  const startEditing = (item: TemplateItem) => {
    setEditingItem(item);
    setFormLabel(item.label);
    // Determine display type
    const isYesNoNa = item.type === 'single_select' && item.options?.join(',') === 'Yes,No,N/A';
    setFormType(isYesNoNa ? 'yes_no_na' : (item.type || 'checklist'));
    setFormOptions(item.type === 'single_select' && !isYesNoNa ? (item.options || []).join(', ') : '');
    setFormConditionalOn(item.conditionalCommentOn || '');
    setShowAddForm(false); // close add form if open
  };

  const buildItemPayload = (id: string, sortOrder: number): TemplateItem => {
    const options = formType === 'single_select' && formOptions.trim()
      ? formOptions.split(',').map(o => o.trim()).filter(Boolean)
      : formType === 'yes_no_na'
      ? ['Yes', 'No', 'N/A']
      : undefined;
    const effectiveType = formType === 'yes_no_na' ? 'single_select' : formType;
    return {
      id,
      label: formLabel.trim(),
      sortOrder,
      type: effectiveType === 'checklist' ? undefined : effectiveType,
      options,
      conditionalCommentOn: formConditionalOn || undefined,
      required: (formType === 'single_select' || formType === 'yes_no_na' || formType === 'photo_required') ? true : undefined,
    };
  };

  const handleAddItem = () => {
    if (!formLabel.trim() || !selectedTemplateId || !selectedSectionId) return;
    dispatch({
      type: 'ADD_TEMPLATE_ITEM',
      payload: {
        templateId: selectedTemplateId,
        sectionId: selectedSectionId,
        item: buildItemPayload(`item-custom-${Date.now()}`, (selectedSection?.items.length || 0) + 1),
      },
    });
    resetForm();
  };

  const handleSaveEdit = () => {
    if (!formLabel.trim() || !selectedTemplateId || !selectedSectionId || !editingItem) return;
    dispatch({
      type: 'UPDATE_TEMPLATE_ITEM',
      payload: {
        templateId: selectedTemplateId,
        sectionId: selectedSectionId,
        item: buildItemPayload(editingItem.id, editingItem.sortOrder),
      },
    });
    resetForm();
  };

  const handleRemoveItem = (itemId: string) => {
    if (!selectedTemplateId || !selectedSectionId) return;
    dispatch({
      type: 'REMOVE_TEMPLATE_ITEM',
      payload: { templateId: selectedTemplateId, sectionId: selectedSectionId, itemId },
    });
    if (editingItem?.id === itemId) resetForm();
  };

  // Shared question form (used for both add and edit)
  const renderQuestionForm = (mode: 'add' | 'edit') => (
    <div className="bg-muted rounded-xl p-4 space-y-3 border-2 border-primary/30">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">{mode === 'edit' ? 'Edit Question' : 'New Question'}</p>
        <button onClick={resetForm} className="p-1 text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1">Question Text</label>
        <input
          type="text"
          value={formLabel}
          onChange={e => setFormLabel(e.target.value)}
          placeholder="e.g. Wire rope condition check"
          className="w-full p-2.5 border border-border rounded-lg bg-background text-sm"
          autoFocus
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1">Question Type</label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {typeConfig.map(tc => (
            <button
              key={tc.value}
              onClick={() => setFormType(tc.value)}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                formType === tc.value ? 'border-primary bg-primary/10' : 'border-border bg-background'
              }`}
            >
              <div className="flex justify-center mb-1">{tc.icon}</div>
              <p className="text-xs font-bold">{tc.label}</p>
              <p className="text-[9px] text-muted-foreground">{tc.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {formType === 'single_select' && (
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Options (comma separated)</label>
          <input
            type="text"
            value={formOptions}
            onChange={e => setFormOptions(e.target.value)}
            placeholder="e.g. Yes, No, N/A"
            className="w-full p-2.5 border border-border rounded-lg bg-background text-sm"
          />
          <div className="mt-1">
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Require comment when answer is (optional)</label>
            <input
              type="text"
              value={formConditionalOn}
              onChange={e => setFormConditionalOn(e.target.value)}
              placeholder="e.g. No"
              className="w-full p-2.5 border border-border rounded-lg bg-background text-sm"
            />
          </div>
        </div>
      )}

      {formType === 'yes_no_na' && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Options: <strong>Yes, No, N/A</strong></p>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Require comment when answer is (optional)</label>
          <input
            type="text"
            value={formConditionalOn}
            onChange={e => setFormConditionalOn(e.target.value)}
            placeholder="e.g. No"
            className="w-full p-2.5 border border-border rounded-lg bg-background text-sm"
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={mode === 'edit' ? handleSaveEdit : handleAddItem}
          disabled={!formLabel.trim() || (formType === 'single_select' && !formOptions.trim())}
          className="flex-1 tap-target bg-primary text-primary-foreground rounded-xl font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {mode === 'edit' ? <><Save className="w-4 h-4" /> Save Changes</> : 'Add to Form'}
        </button>
        <button
          onClick={resetForm}
          className="px-4 tap-target bg-muted rounded-xl font-semibold text-sm border border-border"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  // Step 1: Select template
  if (!selectedTemplateId) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Select a Form</p>
        {state.templates.map(t => (
          <button
            key={t.id}
            onClick={() => setSelectedTemplateId(t.id)}
            className="w-full bg-muted rounded-xl p-4 text-left active:bg-foreground/10 transition-colors flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-sm">{t.craneType}</p>
              <p className="text-xs text-muted-foreground">{t.inspectionType} • v{t.version} • {t.sections.length} sections</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        ))}
        {state.templates.length === 0 && (
          <p className="text-center text-muted-foreground py-8 text-sm">No templates available</p>
        )}
      </div>
    );
  }

  // Step 2: Select section
  if (!selectedSectionId && selectedTemplate) {
    return (
      <div className="p-4 space-y-3">
        <button onClick={() => setSelectedTemplateId(null)} className="text-sm text-primary font-medium mb-2">
          ← Back to Forms
        </button>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {selectedTemplate.craneType} — Select Section
        </p>
        {selectedTemplate.sections.map(sec => (
          <button
            key={sec.id}
            onClick={() => setSelectedSectionId(sec.id)}
            className="w-full bg-muted rounded-xl p-4 text-left active:bg-foreground/10 transition-colors flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-sm">{sec.name}</p>
              <p className="text-xs text-muted-foreground">{sec.items.length} questions</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        ))}
      </div>
    );
  }

  // Step 3: View section items + add/edit
  if (selectedSection && selectedTemplate) {
    return (
      <div className="p-4 space-y-3">
        <button onClick={() => { setSelectedSectionId(null); resetForm(); }} className="text-sm text-primary font-medium mb-2">
          ← Back to Sections
        </button>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{selectedTemplate.craneType}</p>
            <p className="font-bold text-base">{selectedSection.name}</p>
          </div>
          <span className="text-xs bg-muted px-2 py-1 rounded-full font-medium">
            {selectedSection.items.length} items
          </span>
        </div>

        {/* Existing items */}
        <div className="space-y-1">
          {selectedSection.items.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-center gap-2 rounded-lg p-3 transition-colors ${
                editingItem?.id === item.id ? 'bg-primary/10 ring-2 ring-primary' : 'bg-muted'
              }`}
            >
              <span className="text-xs font-bold text-muted-foreground w-6">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {item.type === 'single_select' ? `Select: ${item.options?.join(', ')}` :
                   item.type === 'numeric' ? 'Numeric input' :
                   item.type === 'date' ? 'Date picker' :
                   item.type === 'text' ? 'Text / Notes' :
                   item.type === 'photo_required' ? 'Photo required' :
                   'Checklist (Pass/Defect)'}
                </p>
              </div>
              <button
                onClick={() => startEditing(item)}
                className="p-1.5 text-muted-foreground active:text-primary transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleRemoveItem(item.id)}
                className="p-1.5 text-muted-foreground active:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Edit form */}
        {editingItem && renderQuestionForm('edit')}

        {/* Add question */}
        {!editingItem && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full tap-target bg-primary text-primary-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Question
          </button>
        )}
        {!editingItem && showAddForm && renderQuestionForm('add')}
      </div>
    );
  }

  return null;
}
