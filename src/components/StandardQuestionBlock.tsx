import { useState, useRef } from 'react';
import { CheckCircle, XCircle, MinusCircle, Camera, X, ChevronDown, ChevronUp, AlertTriangle, ImagePlus } from 'lucide-react';

export interface QuestionConfig {
  question_id: string;
  question_text: string;
  help_text?: string | null;
  standard_ref?: string | null;
  answer_type: string;
  options?: string[] | null;
  requires_photo_on_fail: boolean;
  requires_comment_on_fail: boolean;
  severity_required_on_fail: boolean;
  optional_photo?: boolean;
  optional_comment?: boolean;
  required: boolean;
  section: string;
  auto_defect_types?: string[];
  advanced_defect_options?: string[];
}

export interface ResponseData {
  question_id: string;
  answer_value: string | null;
  pass_fail_status: string | null;
  severity: string | null;
  comment: string | null;
  photo_urls: string[];
  defect_flag: boolean;
  urgency?: string | null;
  defect_types?: string[];
  advanced_defect_detail?: string[];
  internal_note?: string | null;
  suggested_defect_type?: string | null;
  suggested_defect_detail?: string | null;
}

interface Props {
  question: QuestionConfig;
  response: ResponseData;
  onUpdate: (response: ResponseData) => void;
}

const ALL_DEFECT_CATEGORIES = [
  'Structural',
  'Mechanical Wear',
  'Electrical',
  'Safety Device',
  'Compliance / Documentation',
  'Adjustment Required',
];

const URGENCY_LEVELS = [
  { value: 'Monitor', label: 'Monitor', color: 'bg-green-600 text-white' },
  { value: 'Schedule Repair Before Next Service', label: 'Schedule Repair Before Next Service', color: 'bg-yellow-500 text-foreground' },
  { value: 'Urgent Repair Before Next Use', label: 'Urgent Repair Before Next Use', color: 'bg-rka-orange text-destructive-foreground' },
  { value: 'Immediate - Remove From Service and Repair Immediately', label: 'Immediate - Remove From Service', color: 'bg-rka-red text-destructive-foreground' },
];

export function StandardQuestionBlock({ question, response, onUpdate }: Props) {
  const [showComment, setShowComment] = useState(!!response.comment);
  const [showPhotos, setShowPhotos] = useState(response.photo_urls.length > 0);
  const [defectExpanded, setDefectExpanded] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const failTriggers = ['Fail', 'No', 'Present but Not Maintained', 'Overdue'];
  const isFail = failTriggers.includes(response.pass_fail_status || '') || failTriggers.includes(response.answer_value || '');
  const isAnswered = !!response.answer_value || !!response.pass_fail_status;
  const isPassed = response.pass_fail_status === 'Pass' || 
    (['Yes', 'Current', 'Compliant', 'Not Required'].includes(response.answer_value || '') && !isFail);

  const update = (partial: Partial<ResponseData>) => {
    onUpdate({ ...response, ...partial });
  };

  const handlePassFail = (status: string) => {
    const defect = failTriggers.includes(status);
    const newResponse: Partial<ResponseData> = {
      pass_fail_status: status,
      answer_value: status,
      defect_flag: defect,
    };
    // Auto-populate defect types on fail
    if (defect && question.auto_defect_types && question.auto_defect_types.length > 0) {
      newResponse.defect_types = [...question.auto_defect_types];
    }
    if (!defect) {
      newResponse.urgency = null;
      newResponse.defect_types = [];
      newResponse.advanced_defect_detail = [];
      newResponse.internal_note = null;
    }
    update(newResponse);
    if (defect) {
      if (question.requires_comment_on_fail) setShowComment(true);
      if (question.requires_photo_on_fail) setShowPhotos(true);
    }
  };

  const handleSelectValue = (val: string) => {
    const defect = failTriggers.includes(val);
    const newResponse: Partial<ResponseData> = {
      answer_value: val,
      pass_fail_status: defect ? 'Fail' : 'Pass',
      defect_flag: defect,
    };
    if (defect && question.auto_defect_types && question.auto_defect_types.length > 0) {
      newResponse.defect_types = [...question.auto_defect_types];
    }
    if (!defect) {
      newResponse.urgency = null;
      newResponse.defect_types = [];
      newResponse.advanced_defect_detail = [];
      newResponse.internal_note = null;
    }
    update(newResponse);
    if (defect) {
      if (question.requires_comment_on_fail) setShowComment(true);
      if (question.requires_photo_on_fail) setShowPhotos(true);
    }
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const urls = [...response.photo_urls, reader.result as string];
      update({ photo_urls: urls });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removePhoto = (idx: number) => {
    update({ photo_urls: response.photo_urls.filter((_, i) => i !== idx) });
  };

  const toggleDefectType = (type: string) => {
    const current = response.defect_types || [];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    update({ defect_types: updated });
  };

  const toggleAdvancedDetail = (detail: string) => {
    const current = response.advanced_defect_detail || [];
    const updated = current.includes(detail)
      ? current.filter(d => d !== detail)
      : [...current, detail];
    update({ advanced_defect_detail: updated });
  };

  const rowClass = isPassed ? 'bg-rka-green/5 border-l-4 border-l-rka-green' : isFail ? 'bg-rka-red/5 border-l-4 border-l-rka-red' : '';

  const renderPhotosSection = (required: boolean) => (
    <div className="space-y-2">
      {response.photo_urls.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {response.photo_urls.map((p, i) => (
            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
              <img src={p} alt="" className="w-full h-full object-cover" />
              <button onClick={() => removePhoto(i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
        <input ref={galleryRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          className={`flex-1 h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-dashed ${
            required ? 'bg-rka-red/10 text-rka-red border-rka-red/30' : 'bg-primary/10 text-primary border-primary/30'
          }`}
        >
          <Camera className="w-4 h-4" />
          Take Photo
        </button>
        <button
          onClick={() => galleryRef.current?.click()}
          className={`flex-1 h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-dashed ${
            required ? 'bg-rka-red/10 text-rka-red border-rka-red/30' : 'bg-primary/10 text-primary border-primary/30'
          }`}
        >
          <ImagePlus className="w-4 h-4" />
          Upload
        </button>
      </div>
    </div>
  );

  return (
    <div className={`border-b border-border transition-all ${rowClass}`}>
      <div className="px-4 py-3 space-y-2">
        {/* Question label */}
        <p className="text-sm font-medium leading-snug text-foreground">{question.question_text}</p>

        {question.help_text && (
          <p className="text-xs text-muted-foreground italic">{question.help_text}</p>
        )}
        {question.standard_ref && (
          <p className="text-xs text-muted-foreground">Ref: {question.standard_ref}</p>
        )}

        {/* === Answer inputs by type === */}

        {/* PassFailNA */}
        {question.answer_type === 'PassFailNA' && (
          <div className="flex gap-2">
            {['Pass', 'Fail', 'NA'].map(opt => (
              <button
                key={opt}
                onClick={() => handlePassFail(opt)}
                className={`flex-1 h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all ${
                  response.pass_fail_status === opt
                    ? opt === 'Pass' ? 'bg-rka-green text-primary-foreground'
                    : opt === 'Fail' ? 'bg-rka-red text-destructive-foreground'
                    : 'bg-muted-foreground text-background'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {opt === 'Pass' ? <CheckCircle className="w-4 h-4" /> : opt === 'Fail' ? <XCircle className="w-4 h-4" /> : <MinusCircle className="w-4 h-4" />}
                {opt === 'NA' ? 'N/A' : opt === 'Fail' ? 'Defect Noted' : opt}
              </button>
            ))}
          </div>
        )}

        {/* YesNo */}
        {question.answer_type === 'YesNo' && (
          <div className="flex gap-2">
            {['Yes', 'No'].map(opt => (
              <button key={opt} onClick={() => handleSelectValue(opt)}
                className={`flex-1 h-11 rounded-xl font-bold text-sm transition-all ${
                  response.answer_value === opt
                    ? opt === 'Yes' ? 'bg-rka-green text-primary-foreground' : 'bg-rka-red text-destructive-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>{opt}</button>
            ))}
          </div>
        )}

        {/* YesNoNA */}
        {question.answer_type === 'YesNoNA' && (
          <div className="flex gap-2">
            {['Yes', 'No', 'N/A'].map(opt => (
              <button key={opt} onClick={() => opt === 'N/A' ? handlePassFail('NA') : handleSelectValue(opt)}
                className={`flex-1 h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all ${
                  (opt === 'N/A' && response.pass_fail_status === 'NA') || response.answer_value === opt
                    ? opt === 'Yes' ? 'bg-rka-green text-primary-foreground'
                    : opt === 'No' ? 'bg-rka-red text-destructive-foreground'
                    : 'bg-muted-foreground text-background'
                    : 'bg-muted text-muted-foreground'
                }`}>{opt}</button>
            ))}
          </div>
        )}

        {/* YesPartialNo */}
        {question.answer_type === 'YesPartialNo' && (
          <div className="flex gap-2">
            {['Yes', 'Partial', 'No'].map(opt => (
              <button key={opt} onClick={() => handleSelectValue(opt)}
                className={`flex-1 h-11 rounded-xl font-bold text-sm transition-all ${
                  response.answer_value === opt
                    ? opt === 'Yes' ? 'bg-rka-green text-primary-foreground'
                    : opt === 'No' ? 'bg-rka-red text-destructive-foreground'
                    : 'bg-rka-orange text-destructive-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>{opt}</button>
            ))}
          </div>
        )}

        {/* SingleSelect */}
        {question.answer_type === 'SingleSelect' && question.options && (
          <div className="flex flex-wrap gap-2">
            {question.options.map((opt, optIdx) => {
              const isSelected = response.answer_value === opt;
              // For 3-option selects, color positionally: first=green, second=amber, third=red
              const is3Opt = question.options!.length === 3;
              let selectedClass = '';
              if (isSelected) {
                if (is3Opt) {
                  selectedClass = optIdx === 0 ? 'bg-rka-green text-primary-foreground'
                    : optIdx === 1 ? 'bg-rka-orange text-destructive-foreground'
                    : 'bg-rka-red text-destructive-foreground';
                } else {
                  selectedClass = failTriggers.includes(opt) ? 'bg-rka-red text-destructive-foreground' : 'bg-primary text-primary-foreground';
                }
              }
              return (
                <button key={opt} onClick={() => handleSelectValue(opt)}
                  className={`px-3 h-10 rounded-xl font-semibold text-sm transition-all flex-1 min-w-0 ${
                    isSelected ? selectedClass : 'bg-muted text-muted-foreground'
                  }`}>{opt}</button>
              );
            })}
          </div>
        )}

        {/* Text */}
        {question.answer_type === 'Text' && (
          <textarea
            value={response.answer_value || ''}
            onChange={(e) => update({ answer_value: e.target.value || null, pass_fail_status: e.target.value ? 'Pass' : null })}
            placeholder="Enter notes…"
            rows={2}
            className="w-full p-2.5 border border-border rounded-lg bg-background text-sm resize-none"
          />
        )}

        {/* Number */}
        {question.answer_type === 'Number' && (
          <input type="number" inputMode="decimal" value={response.answer_value || ''}
            onChange={(e) => update({ answer_value: e.target.value || null, pass_fail_status: 'Pass' })}
            placeholder="—" className="w-28 h-11 px-3 border border-border rounded-lg bg-background text-sm text-right font-medium" />
        )}

        {/* Date */}
        {question.answer_type === 'Date' && (
          <input type="date" value={response.answer_value || ''}
            onChange={(e) => update({ answer_value: e.target.value || null, pass_fail_status: e.target.value ? 'Pass' : null })}
            className="w-full h-11 px-3 border border-border rounded-lg bg-background text-sm" />
        )}

        {/* PhotoOnly */}
        {question.answer_type === 'PhotoOnly' && renderPhotosSection(true)}

        {/* === Optional comment (when NOT in defect state) === */}
        {question.optional_comment && !isFail && question.answer_type !== 'Text' && (
          <textarea value={response.comment || ''} onChange={(e) => update({ comment: e.target.value || null })}
            placeholder="Optional comment…" rows={2}
            className="w-full p-2.5 border border-border rounded-lg bg-background text-sm resize-none" />
        )}

        {/* === Optional photo (when NOT in defect state) === */}
        {question.optional_photo && !isFail && question.answer_type !== 'PhotoOnly' && renderPhotosSection(false)}

        {/* ===================== DEFECT EXPANSION PANEL ===================== */}
        {isFail && (
          <div className="mt-2 rounded-xl border-2 border-rka-red/30 bg-rka-red/5 overflow-hidden">
            <button
              onClick={() => setDefectExpanded(!defectExpanded)}
              className="w-full px-3 py-2 flex items-center justify-between bg-rka-red/10"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rka-red" />
                <span className="text-sm font-bold text-rka-red">Defect Details</span>
              </div>
              {defectExpanded ? <ChevronUp className="w-4 h-4 text-rka-red" /> : <ChevronDown className="w-4 h-4 text-rka-red" />}
            </button>

            {defectExpanded && (
              <div className="p-3 space-y-3">
                {/* Urgency */}
                <div>
                  <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-1.5">Urgency (Required)</p>
                  <div className="space-y-1.5">
                    {URGENCY_LEVELS.map(u => (
                      <button
                        key={u.value}
                        onClick={() => update({ urgency: u.value })}
                        className={`w-full h-10 rounded-lg font-semibold text-sm transition-all ${
                          response.urgency === u.value ? u.color : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                  {response.urgency === 'Immediate - Remove From Service and Repair Immediately' && (
                    <div className="mt-2 p-2 bg-rka-red/20 rounded-lg flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rka-red flex-shrink-0" />
                      <p className="text-xs font-bold text-rka-red">⚠️ Photo required. Consider setting Overall Condition = Unsafe.</p>
                    </div>
                  )}
                </div>

                {/* Defect Type Category (Multi-select) */}
                <div>
                  <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-1.5">Defect Type (Multi-select)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_DEFECT_CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => toggleDefectType(cat)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          (response.defect_types || []).includes(cat)
                            ? 'bg-rka-red text-destructive-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Advanced Defect Detail (question-specific) */}
                {question.advanced_defect_options && question.advanced_defect_options.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-1.5">Detail (Optional)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {question.advanced_defect_options.map(opt => (
                        <button
                          key={opt}
                          onClick={() => toggleAdvancedDetail(opt)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            (response.advanced_defect_detail || []).includes(opt)
                              ? 'bg-rka-orange text-destructive-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comment and Recommendation */}
                <div>
                  <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-1.5">Comment & Recommendation (Required)</p>
                  <textarea
                    value={response.comment || ''}
                    onChange={(e) => update({ comment: e.target.value || null })}
                    placeholder="Describe defect and recommended action…"
                    rows={3}
                    className="w-full p-2.5 border border-rka-red/30 rounded-lg bg-background text-sm resize-none"
                  />
                </div>

                {/* Photo Upload */}
                <div>
                  <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-1.5">
                    Photo {response.urgency === 'Immediate - Remove From Service and Repair Immediately' || question.requires_photo_on_fail ? '(Required)' : '(Optional)'}
                  </p>
                  {renderPhotosSection(response.urgency === 'Immediate - Remove From Service and Repair Immediately' || question.requires_photo_on_fail)}
                </div>

                {/* Technician Internal / Quoting Notes */}
                <div>
                  <p className="text-xs font-bold text-rka-orange uppercase tracking-wide mb-1.5">Technician Internal or Quoting Notes</p>
                  <textarea
                    value={response.internal_note || ''}
                    onChange={(e) => update({ internal_note: e.target.value || null })}
                    placeholder="Internal note – not shown on customer report…"
                    rows={2}
                    className="w-full p-2.5 border border-rka-orange/30 rounded-lg bg-rka-orange/5 text-sm resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
