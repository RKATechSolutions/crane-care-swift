import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TemplateItemType, TemplateItem } from '@/types/inspection';
import { Plus, ChevronRight, CheckSquare, List, Hash, Trash2, Calendar, Type, Camera, ToggleLeft, Pencil, X, Save, FilePlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DbFormTemplate {
  form_id: string;
  form_name: string;
  description: string | null;
  active: boolean;
}

interface DbQuestion {
  id: string; // form_template_questions.id
  question_id: string;
  question_text: string;
  section: string;
  answer_type: string;
  sort_order: number;
  help_text: string | null;
  standard_ref: string | null;
  options: string[] | null;
  override_sort_order: number | null;
  override_help_text: string | null;
  override_standard_ref: string | null;
  section_override: string | null;
}

export default function FormBuilder() {
  const { state, dispatch } = useApp();
  const { toast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<TemplateItem | null>(null);

  // Create new form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFormName, setNewFormName] = useState('');
  const [newFormDescription, setNewFormDescription] = useState('');
  const [newFormId, setNewFormId] = useState('');
  const [creatingForm, setCreatingForm] = useState(false);
  const [dbForms, setDbForms] = useState<DbFormTemplate[]>([]);

  // DB form drill-down state
  const [selectedDbFormId, setSelectedDbFormId] = useState<string | null>(null);
  const [selectedDbFormName, setSelectedDbFormName] = useState('');
  const [dbQuestions, setDbQuestions] = useState<DbQuestion[]>([]);
  const [dbSections, setDbSections] = useState<string[]>([]);
  const [selectedDbSection, setSelectedDbSection] = useState<string | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [editingDbQuestion, setEditingDbQuestion] = useState<DbQuestion | null>(null);
  const [dbEditText, setDbEditText] = useState('');
  const [dbEditAnswerType, setDbEditAnswerType] = useState('');
  const [dbEditHelpText, setDbEditHelpText] = useState('');
  const [dbEditStandardRef, setDbEditStandardRef] = useState('');
  const [dbEditOptions, setDbEditOptions] = useState('');
  const [dbEditSection, setDbEditSection] = useState('');
  const [savingDbEdit, setSavingDbEdit] = useState(false);

  useEffect(() => {
    fetchDbForms();
  }, []);

  const fetchDbForms = async () => {
    const { data } = await supabase
      .from('form_templates')
      .select('form_id, form_name, description, active')
      .order('created_at', { ascending: true });
    if (data) setDbForms(data);
  };

  const fetchDbFormQuestions = async (formId: string) => {
    setLoadingQuestions(true);
    try {
      const { data, error } = await supabase
        .from('form_template_questions')
        .select(`
          id,
          question_id,
          override_sort_order,
          override_help_text,
          override_standard_ref,
          section_override,
          question_library!inner (
            question_text,
            section,
            answer_type,
            sort_order,
            help_text,
            standard_ref,
            options
          )
        `)
        .eq('form_id', formId)
        .order('override_sort_order', { ascending: true, nullsFirst: false });

      if (error) throw error;

      const questions: DbQuestion[] = (data || []).map((row: any) => ({
        id: row.id,
        question_id: row.question_id,
        question_text: row.question_library.question_text,
        section: row.section_override || row.question_library.section,
        answer_type: row.question_library.answer_type,
        sort_order: row.override_sort_order ?? row.question_library.sort_order,
        help_text: row.override_help_text || row.question_library.help_text,
        standard_ref: row.override_standard_ref || row.question_library.standard_ref,
        options: row.question_library.options,
        override_sort_order: row.override_sort_order,
        override_help_text: row.override_help_text,
        override_standard_ref: row.override_standard_ref,
        section_override: row.section_override,
      }));

      // Sort by sort_order
      questions.sort((a, b) => a.sort_order - b.sort_order);

      setDbQuestions(questions);

      // Extract unique sections
      const sections = [...new Set(questions.map(q => q.section))];
      setDbSections(sections);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSelectDbForm = (form: DbFormTemplate) => {
    setSelectedDbFormId(form.form_id);
    setSelectedDbFormName(form.form_name);
    setSelectedDbSection(null);
    fetchDbFormQuestions(form.form_id);
  };

  const handleRemoveDbQuestion = async (ftqId: string) => {
    try {
      const { error } = await supabase
        .from('form_template_questions')
        .delete()
        .eq('id', ftqId);
      if (error) throw error;
      toast({ title: 'Question Removed' });
      if (selectedDbFormId) fetchDbFormQuestions(selectedDbFormId);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const startEditingDbQuestion = (q: DbQuestion) => {
    setEditingDbQuestion(q);
    setDbEditText(q.question_text);
    setDbEditAnswerType(q.answer_type);
    setDbEditHelpText(q.help_text || '');
    setDbEditStandardRef(q.standard_ref || '');
    setDbEditOptions(q.options ? q.options.join(', ') : '');
    setDbEditSection(q.section);
  };

  const cancelDbEdit = () => {
    setEditingDbQuestion(null);
    setDbEditText('');
    setDbEditAnswerType('');
    setDbEditHelpText('');
    setDbEditStandardRef('');
    setDbEditOptions('');
    setDbEditSection('');
  };

  const handleSaveDbQuestion = async () => {
    if (!editingDbQuestion || !dbEditText.trim()) return;
    setSavingDbEdit(true);
    try {
      // Update the question in question_library
      const updateData: any = {
        question_text: dbEditText.trim(),
        answer_type: dbEditAnswerType,
        help_text: dbEditHelpText.trim() || null,
        standard_ref: dbEditStandardRef.trim() || null,
        section: dbEditSection.trim() || editingDbQuestion.section,
      };
      if (dbEditAnswerType === 'SingleSelect' || dbEditAnswerType === 'YesPartialNo') {
        updateData.options = dbEditOptions.split(',').map((o: string) => o.trim()).filter(Boolean);
      } else {
        updateData.options = null;
      }

      const { error } = await supabase
        .from('question_library')
        .update(updateData)
        .eq('question_id', editingDbQuestion.question_id);

      if (error) throw error;

      // Update section_override on bridge table if section changed
      if (dbEditSection.trim() && dbEditSection.trim() !== editingDbQuestion.section) {
        await supabase
          .from('form_template_questions')
          .update({ section_override: dbEditSection.trim() })
          .eq('id', editingDbQuestion.id);
      }

      toast({ title: 'Question Updated' });
      cancelDbEdit();
      if (selectedDbFormId) fetchDbFormQuestions(selectedDbFormId);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSavingDbEdit(false);
    }
  };

  const dbAnswerTypes = [
    { value: 'PassFailNA', label: 'Pass / Fail / NA' },
    { value: 'YesPartialNo', label: 'Yes / Partial / No' },
    { value: 'Text', label: 'Text / Notes' },
    { value: 'Number', label: 'Numeric' },
    { value: 'Date', label: 'Date' },
    { value: 'PhotoOnly', label: 'Photo Only' },
    { value: 'SingleSelect', label: 'Single Select' },
  ];

  const generateFormId = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30);
  };

  const handleCreateForm = async () => {
    if (!newFormName.trim() || !newFormId.trim()) return;
    setCreatingForm(true);
    try {
      const { error } = await supabase.from('form_templates').insert({
        form_id: newFormId.trim(),
        form_name: newFormName.trim(),
        description: newFormDescription.trim() || null,
        active: true,
      });
      if (error) throw error;
      toast({ title: 'Form Created', description: `"${newFormName.trim()}" has been created successfully.` });
      setShowCreateForm(false);
      setNewFormName('');
      setNewFormDescription('');
      setNewFormId('');
      fetchDbForms();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create form', variant: 'destructive' });
    } finally {
      setCreatingForm(false);
    }
  };

  // Form state (shared for add + edit) — local templates only
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
    const isYesNoNa = item.type === 'single_select' && item.options?.join(',') === 'Yes,No,N/A';
    setFormType(isYesNoNa ? 'yes_no_na' : (item.type || 'checklist'));
    setFormOptions(item.type === 'single_select' && !isYesNoNa ? (item.options || []).join(', ') : '');
    setFormConditionalOn(item.conditionalCommentOn || '');
    setShowAddForm(false);
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

  const getAnswerTypeLabel = (type: string) => {
    switch (type) {
      case 'PassFailNA': return 'Pass / Fail / NA';
      case 'YesPartialNo': return 'Yes / Partial / No';
      case 'Text': return 'Text / Notes';
      case 'Number': return 'Numeric';
      case 'Date': return 'Date picker';
      case 'PhotoOnly': return 'Photo required';
      case 'SingleSelect': return 'Single select';
      default: return type;
    }
  };

  // Shared question form (used for both add and edit) — local templates
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

  // ====== DB Form: Section question list ======
  if (selectedDbFormId && selectedDbSection !== null) {
    const sectionQuestions = dbQuestions.filter(q => q.section === selectedDbSection);
    return (
      <div className="p-4 space-y-3">
        <button onClick={() => setSelectedDbSection(null)} className="text-sm text-primary font-medium mb-2">
          ← Back to Sections
        </button>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{selectedDbFormName}</p>
            <p className="font-bold text-base">{selectedDbSection}</p>
          </div>
          <span className="text-xs bg-muted px-2 py-1 rounded-full font-medium">
            {sectionQuestions.length} questions
          </span>
        </div>

        <div className="space-y-1">
          {sectionQuestions.map((q, idx) => (
            <div key={q.id}>
              <div className={`flex items-center gap-2 rounded-lg p-3 transition-colors ${
                editingDbQuestion?.id === q.id ? 'bg-primary/10 ring-2 ring-primary' : 'bg-muted'
              }`}>
                <span className="text-xs font-bold text-muted-foreground w-6">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{q.question_text}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {getAnswerTypeLabel(q.answer_type)}
                    {q.standard_ref && ` • ${q.standard_ref}`}
                  </p>
                  {q.help_text && (
                    <p className="text-[10px] text-muted-foreground/70 italic truncate">{q.help_text}</p>
                  )}
                </div>
                <button
                  onClick={() => startEditingDbQuestion(q)}
                  className="p-1.5 text-muted-foreground active:text-primary transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleRemoveDbQuestion(q.id)}
                  className="p-1.5 text-muted-foreground active:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Inline edit form */}
              {editingDbQuestion?.id === q.id && (
                <div className="bg-muted rounded-xl p-4 space-y-3 border-2 border-primary/30 mt-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">Edit Question</p>
                    <button onClick={cancelDbEdit} className="p-1 text-muted-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Question Text</label>
                    <input
                      type="text"
                      value={dbEditText}
                      onChange={e => setDbEditText(e.target.value)}
                      className="w-full p-2.5 border border-border rounded-lg bg-background text-sm"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Answer Type</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {dbAnswerTypes.map(at => (
                        <button
                          key={at.value}
                          onClick={() => setDbEditAnswerType(at.value)}
                          className={`p-2 rounded-lg border-2 text-center transition-all text-xs font-semibold ${
                            dbEditAnswerType === at.value ? 'border-primary bg-primary/10' : 'border-border bg-background'
                          }`}
                        >
                          {at.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(dbEditAnswerType === 'SingleSelect' || dbEditAnswerType === 'YesPartialNo') && (
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Options (comma separated)</label>
                      <input
                        type="text"
                        value={dbEditOptions}
                        onChange={e => setDbEditOptions(e.target.value)}
                        placeholder="e.g. Good, Fair, Poor"
                        className="w-full p-2.5 border border-border rounded-lg bg-background text-sm"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Section</label>
                    <input
                      type="text"
                      value={dbEditSection}
                      onChange={e => setDbEditSection(e.target.value)}
                      className="w-full p-2.5 border border-border rounded-lg bg-background text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Help Text (optional)</label>
                    <input
                      type="text"
                      value={dbEditHelpText}
                      onChange={e => setDbEditHelpText(e.target.value)}
                      placeholder="Guidance shown to technicians"
                      className="w-full p-2.5 border border-border rounded-lg bg-background text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Standard Ref (optional)</label>
                    <input
                      type="text"
                      value={dbEditStandardRef}
                      onChange={e => setDbEditStandardRef(e.target.value)}
                      placeholder="e.g. AS 2550 Cl 8.3.1"
                      className="w-full p-2.5 border border-border rounded-lg bg-background text-sm"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveDbQuestion}
                      disabled={!dbEditText.trim() || savingDbEdit}
                      className="flex-1 tap-target bg-primary text-primary-foreground rounded-xl font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {savingDbEdit ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                    </button>
                    <button
                      onClick={cancelDbEdit}
                      className="px-4 tap-target bg-muted rounded-xl font-semibold text-sm border border-border"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {sectionQuestions.length === 0 && (
          <p className="text-center text-muted-foreground py-6 text-sm">No questions in this section</p>
        )}
      </div>
    );
  }

  // ====== DB Form: Section list ======
  if (selectedDbFormId && selectedDbSection === null) {
    return (
      <div className="p-4 space-y-3">
        <button onClick={() => { setSelectedDbFormId(null); setSelectedDbFormName(''); setDbQuestions([]); setDbSections([]); }} className="text-sm text-primary font-medium mb-2">
          ← Back to Forms
        </button>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {selectedDbFormName} — Sections
        </p>

        {loadingQuestions ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : dbSections.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="font-medium">No questions linked yet</p>
            <p className="text-sm">Add questions via the Question Library</p>
          </div>
        ) : (
          dbSections.map(sec => {
            const count = dbQuestions.filter(q => q.section === sec).length;
            return (
              <button
                key={sec}
                onClick={() => setSelectedDbSection(sec)}
                className="w-full bg-muted rounded-xl p-4 text-left active:bg-foreground/10 transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-sm">{sec}</p>
                  <p className="text-xs text-muted-foreground">{count} question{count !== 1 ? 's' : ''}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            );
          })
        )}

        <div className="bg-muted/50 rounded-xl p-3 mt-2">
          <p className="text-xs text-muted-foreground">
            <strong>Total:</strong> {dbQuestions.length} questions across {dbSections.length} sections
          </p>
        </div>
      </div>
    );
  }

  // ====== Step 1: Select template ======
  if (!selectedTemplateId) {
    return (
      <div className="p-4 space-y-3">
        {/* Create New Form */}
        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full tap-target bg-primary text-primary-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          >
            <FilePlus className="w-5 h-5" />
            Create New Form
          </button>
        ) : (
          <div className="bg-muted rounded-xl p-4 space-y-3 border-2 border-primary/30">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Create New Form</p>
              <button onClick={() => { setShowCreateForm(false); setNewFormName(''); setNewFormDescription(''); setNewFormId(''); }} className="p-1 text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Form Name *</label>
              <input
                type="text"
                value={newFormName}
                onChange={e => { setNewFormName(e.target.value); setNewFormId(generateFormId(e.target.value)); }}
                placeholder="e.g. Jib Crane Inspection"
                className="w-full p-2.5 border border-border rounded-lg bg-background text-sm"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Form ID</label>
              <input
                type="text"
                value={newFormId}
                onChange={e => setNewFormId(e.target.value)}
                placeholder="auto-generated"
                className="w-full p-2.5 border border-border rounded-lg bg-background text-sm font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">Unique identifier — auto-generated from name</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Description (optional)</label>
              <input
                type="text"
                value={newFormDescription}
                onChange={e => setNewFormDescription(e.target.value)}
                placeholder="e.g. Standard inspection for jib cranes"
                className="w-full p-2.5 border border-border rounded-lg bg-background text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateForm}
                disabled={!newFormName.trim() || !newFormId.trim() || creatingForm}
                className="flex-1 tap-target bg-primary text-primary-foreground rounded-xl font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {creatingForm ? 'Creating...' : 'Create Form'}
              </button>
              <button
                onClick={() => { setShowCreateForm(false); setNewFormName(''); setNewFormDescription(''); setNewFormId(''); }}
                className="px-4 tap-target bg-muted rounded-xl font-semibold text-sm border border-border"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* DB Forms */}
        {dbForms.length > 0 && (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2">Forms</p>
            {dbForms.map(f => (
              <button
                key={f.form_id}
                onClick={() => handleSelectDbForm(f)}
                className="w-full bg-muted rounded-xl p-4 text-left active:bg-foreground/10 transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-sm">{f.form_name}</p>
                  <p className="text-xs text-muted-foreground">{f.form_id}{f.description ? ` • ${f.description}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${f.active ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/10 text-muted-foreground'}`}>
                    {f.active ? 'Active' : 'Inactive'}
                  </span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </button>
            ))}
          </>
        )}

        {/* Local templates (legacy) */}
        {state.templates.length > 0 && (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2">Local Templates</p>
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
          </>
        )}

        {state.templates.length === 0 && dbForms.length === 0 && (
          <p className="text-center text-muted-foreground py-8 text-sm">No templates available</p>
        )}
      </div>
    );
  }

  // Step 2: Select section (local templates)
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

  // Step 3: View section items + add/edit (local templates)
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

        {editingItem && renderQuestionForm('edit')}

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
