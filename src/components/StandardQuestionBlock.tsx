import { useState, useRef } from 'react';
import { CheckCircle, XCircle, MinusCircle, Camera, X, ChevronDown } from 'lucide-react';

export interface QuestionConfig {
  question_id: string;
  question_text: string;
  help_text?: string | null;
  standard_ref?: string | null;
  answer_type: string; // PassFailNA | YesNo | YesPartialNo | SingleSelect | Text | Number | Date | PhotoOnly
  options?: string[] | null;
  requires_photo_on_fail: boolean;
  requires_comment_on_fail: boolean;
  severity_required_on_fail: boolean;
  required: boolean;
  section: string;
}

export interface ResponseData {
  question_id: string;
  answer_value: string | null;
  pass_fail_status: string | null; // Pass | Fail | NA
  severity: string | null;
  comment: string | null;
  photo_urls: string[];
  defect_flag: boolean;
}

interface Props {
  question: QuestionConfig;
  response: ResponseData;
  onUpdate: (response: ResponseData) => void;
}

export function StandardQuestionBlock({ question, response, onUpdate }: Props) {
  const [showComment, setShowComment] = useState(!!response.comment);
  const [showPhotos, setShowPhotos] = useState(response.photo_urls.length > 0);
  const fileRef = useRef<HTMLInputElement>(null);

  const isFail = response.pass_fail_status === 'Fail' || response.answer_value === 'No' || response.answer_value === 'Fail';
  const isAnswered = !!response.answer_value || !!response.pass_fail_status;
  const isPassed = response.pass_fail_status === 'Pass' || (response.answer_value === 'Yes' && !isFail);

  const update = (partial: Partial<ResponseData>) => {
    onUpdate({ ...response, ...partial });
  };

  const handlePassFail = (status: string) => {
    const failValues = ['Fail'];
    const defect = failValues.includes(status);
    update({
      pass_fail_status: status,
      answer_value: status,
      defect_flag: defect,
    });
    if (defect) {
      if (question.requires_comment_on_fail) setShowComment(true);
      if (question.requires_photo_on_fail) setShowPhotos(true);
    }
  };

  const handleSelectValue = (val: string) => {
    const failTriggers = ['No', 'Fail', 'Not yet'];
    const defect = failTriggers.includes(val);
    update({
      answer_value: val,
      pass_fail_status: defect ? 'Fail' : 'Pass',
      defect_flag: defect,
    });
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

  const rowClass = isPassed ? 'bg-rka-green/5 border-l-4 border-l-rka-green' : isFail ? 'bg-rka-red/5 border-l-4 border-l-rka-red' : '';

  return (
    <div className={`border-b border-border transition-all ${rowClass}`}>
      <div className="px-4 py-3 space-y-2">
        {/* Question label */}
        <p className="text-sm font-medium leading-snug text-foreground">{question.question_text}</p>

        {/* Help text */}
        {question.help_text && (
          <p className="text-xs text-muted-foreground italic">{question.help_text}</p>
        )}

        {/* Standard reference */}
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
                {opt === 'NA' ? 'N/A' : opt}
              </button>
            ))}
          </div>
        )}

        {/* YesNo */}
        {question.answer_type === 'YesNo' && (
          <div className="flex gap-2">
            {['Yes', 'No'].map(opt => (
              <button
                key={opt}
                onClick={() => handleSelectValue(opt)}
                className={`flex-1 h-11 rounded-xl font-bold text-sm transition-all ${
                  response.answer_value === opt
                    ? opt === 'Yes' ? 'bg-rka-green text-primary-foreground' : 'bg-rka-red text-destructive-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* YesPartialNo */}
        {question.answer_type === 'YesPartialNo' && (
          <div className="flex gap-2">
            {['Yes', 'Partial', 'No'].map(opt => (
              <button
                key={opt}
                onClick={() => handleSelectValue(opt)}
                className={`flex-1 h-11 rounded-xl font-bold text-sm transition-all ${
                  response.answer_value === opt
                    ? opt === 'Yes' ? 'bg-rka-green text-primary-foreground'
                    : opt === 'No' ? 'bg-rka-red text-destructive-foreground'
                    : 'bg-rka-orange text-destructive-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* SingleSelect */}
        {question.answer_type === 'SingleSelect' && question.options && (
          <div className="flex flex-wrap gap-2">
            {question.options.map(opt => (
              <button
                key={opt}
                onClick={() => handleSelectValue(opt)}
                className={`px-3 h-10 rounded-xl font-semibold text-sm transition-all ${
                  response.answer_value === opt
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {opt}
              </button>
            ))}
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
          <input
            type="number"
            inputMode="decimal"
            value={response.answer_value || ''}
            onChange={(e) => update({ answer_value: e.target.value || null, pass_fail_status: 'Pass' })}
            placeholder="—"
            className="w-28 h-11 px-3 border border-border rounded-lg bg-background text-sm text-right font-medium"
          />
        )}

        {/* Date */}
        {question.answer_type === 'Date' && (
          <input
            type="date"
            value={response.answer_value || ''}
            onChange={(e) => update({ answer_value: e.target.value || null, pass_fail_status: e.target.value ? 'Pass' : null })}
            className="w-full h-11 px-3 border border-border rounded-lg bg-background text-sm"
          />
        )}

        {/* PhotoOnly */}
        {question.answer_type === 'PhotoOnly' && (
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
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-11 bg-primary/10 text-primary rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-2 border-dashed border-primary/30"
            >
              <Camera className="w-5 h-5" />
              {response.photo_urls.length > 0 ? 'Add Another Photo' : 'Take / Upload Photo'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
          </div>
        )}

        {/* === Conditional fields on Fail === */}
        {isFail && (
          <div className="space-y-2 pt-1">
            {/* Severity */}
            {question.severity_required_on_fail && (
              <div className="flex gap-2">
                {['Low', 'Medium', 'High', 'Critical'].map(s => (
                  <button
                    key={s}
                    onClick={() => update({ severity: s })}
                    className={`flex-1 h-9 rounded-lg font-semibold text-xs transition-all ${
                      response.severity === s
                        ? s === 'Critical' ? 'bg-rka-red text-destructive-foreground'
                        : s === 'High' ? 'bg-rka-orange text-destructive-foreground'
                        : s === 'Medium' ? 'bg-yellow-500 text-foreground'
                        : 'bg-muted-foreground/20 text-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Comment */}
            {question.requires_comment_on_fail && (
              <textarea
                value={response.comment || ''}
                onChange={(e) => update({ comment: e.target.value || null })}
                placeholder="Comment (required for defect)…"
                rows={2}
                className="w-full p-2.5 border border-rka-red/30 rounded-lg bg-background text-sm resize-none"
              />
            )}

            {/* Photo upload on fail */}
            {question.requires_photo_on_fail && question.answer_type !== 'PhotoOnly' && (
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
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-10 bg-rka-red/10 text-rka-red rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-dashed border-rka-red/30"
                >
                  <Camera className="w-4 h-4" />
                  {response.photo_urls.length > 0 ? 'Add Photo' : 'Photo Required'}
                </button>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
