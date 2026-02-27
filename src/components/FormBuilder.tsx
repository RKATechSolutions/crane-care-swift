import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TemplateItemType } from '@/types/inspection';
import { Plus, ChevronRight, CheckSquare, List, Hash, Trash2, Calendar, Type, Camera, ToggleLeft } from 'lucide-react';

export default function FormBuilder() {
  const { state, dispatch } = useApp();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // New item state
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<TemplateItemType>('checklist');
  const [newOptions, setNewOptions] = useState('');
  const [newConditionalOn, setNewConditionalOn] = useState('');

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

  const handleAddItem = () => {
    if (!newLabel.trim() || !selectedTemplateId || !selectedSectionId) return;

    const options = newType === 'single_select' && newOptions.trim()
      ? newOptions.split(',').map(o => o.trim()).filter(Boolean)
      : newType === 'yes_no_na'
      ? ['Yes', 'No', 'N/A']
      : undefined;
      : undefined;

    const effectiveType = newType === 'yes_no_na' ? 'single_select' : newType;

    dispatch({
      type: 'ADD_TEMPLATE_ITEM',
      payload: {
        templateId: selectedTemplateId,
        sectionId: selectedSectionId,
        item: {
          id: `item-custom-${Date.now()}`,
          label: newLabel.trim(),
          sortOrder: (selectedSection?.items.length || 0) + 1,
          type: effectiveType === 'checklist' ? undefined : effectiveType,
          options,
          conditionalCommentOn: newConditionalOn || undefined,
          required: (newType === 'single_select' || newType === 'yes_no_na' || newType === 'photo_required') ? true : undefined,
        },
      },
    });

    setNewLabel('');
    setNewType('checklist');
    setNewOptions('');
    setNewConditionalOn('');
    setShowAddForm(false);
  };

  const handleRemoveItem = (itemId: string) => {
    if (!selectedTemplateId || !selectedSectionId) return;
    dispatch({
      type: 'REMOVE_TEMPLATE_ITEM',
      payload: { templateId: selectedTemplateId, sectionId: selectedSectionId, itemId },
    });
  };

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
        <button
          onClick={() => setSelectedTemplateId(null)}
          className="text-sm text-primary font-medium mb-2"
        >
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

  // Step 3: View section items + add new
  if (selectedSection && selectedTemplate) {
    return (
      <div className="p-4 space-y-3">
        <button
          onClick={() => setSelectedSectionId(null)}
          className="text-sm text-primary font-medium mb-2"
        >
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
            <div key={item.id} className="flex items-center gap-2 bg-muted rounded-lg p-3">
              <span className="text-xs font-bold text-muted-foreground w-6">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {item.type === 'single_select' ? `Select: ${item.options?.join(', ')}` :
                   item.type === 'numeric' ? 'Numeric input' : 'Checklist (Pass/Defect)'}
                </p>
              </div>
              <button
                onClick={() => handleRemoveItem(item.id)}
                className="p-1.5 text-muted-foreground active:text-rka-red transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add question form */}
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full tap-target bg-primary text-primary-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Question
          </button>
        ) : (
          <div className="bg-muted rounded-xl p-4 space-y-3 border-2 border-primary/30">
            <p className="text-sm font-bold">New Question</p>

            {/* Question label */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Question Text</label>
              <input
                type="text"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="e.g. Wire rope condition check"
                className="w-full p-2.5 border border-border rounded-lg bg-background text-sm"
                autoFocus
              />
            </div>

            {/* Question type */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Question Type</label>
              <div className="grid grid-cols-3 gap-2">
                {typeConfig.map(tc => (
                  <button
                    key={tc.value}
                    onClick={() => setNewType(tc.value)}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      newType === tc.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background'
                    }`}
                  >
                    <div className="flex justify-center mb-1">{tc.icon}</div>
                    <p className="text-xs font-bold">{tc.label}</p>
                    <p className="text-[9px] text-muted-foreground">{tc.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Options for single_select */}
            {newType === 'single_select' && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Options (comma separated)</label>
                <input
                  type="text"
                  value={newOptions}
                  onChange={e => setNewOptions(e.target.value)}
                  placeholder="e.g. Yes, No, N/A"
                  className="w-full p-2.5 border border-border rounded-lg bg-background text-sm"
                />
                <div className="mt-1">
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Require comment when answer is (optional)</label>
                  <input
                    type="text"
                    value={newConditionalOn}
                    onChange={e => setNewConditionalOn(e.target.value)}
                    placeholder="e.g. No"
                    className="w-full p-2.5 border border-border rounded-lg bg-background text-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleAddItem}
                disabled={!newLabel.trim() || (newType === 'single_select' && !newOptions.trim())}
                className="flex-1 tap-target bg-primary text-primary-foreground rounded-xl font-bold text-sm disabled:opacity-40"
              >
                Add to Form
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewLabel(''); setNewType('checklist'); setNewOptions(''); setNewConditionalOn(''); }}
                className="px-4 tap-target bg-muted rounded-xl font-semibold text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
