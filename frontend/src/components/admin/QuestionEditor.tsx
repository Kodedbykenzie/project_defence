import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from '../Modal';
import { Field } from '../ui/Field';
import { domains } from '../../data/domains';
import { inputClass, primaryButton, secondaryButton } from '../../utils/styles';
import type { DomainId, Question } from '../../types/platform';

interface QuestionEditorProps {
  open: boolean;
  question: Question | null;
  defaultDomain: DomainId;
  onClose: () => void;
  onSave: (q: Question) => void;
}

export function QuestionEditor({ open, question, defaultDomain, onClose, onSave }: QuestionEditorProps) {
  const [domain, setDomain] = useState<DomainId>(defaultDomain);
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [answer, setAnswer] = useState(0);
  const [explanation, setExplanation] = useState('');

  useEffect(() => {
    if (!open) return;
    setDomain(question?.domain ?? defaultDomain);
    setPrompt(question?.prompt ?? '');
    setOptions(question ? [...question.options] : ['', '', '', '']);
    setAnswer(question?.answer ?? 0);
    setExplanation(question?.explanation ?? '');
  }, [open, question, defaultDomain]);

  const valid = prompt.trim().length > 10 && options.every((o) => o.trim()) && explanation.trim();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSave({ id: question?.id ?? `q-${Date.now()}`, domain, prompt: prompt.trim(), options: options.map((o) => o.trim()), answer, explanation: explanation.trim() });
  };

  return (
    <Modal open={open} onClose={onClose} title={question ? 'Edit question' : 'New diagnostic question'} description="Every question is tagged to exactly one domain." size="lg">
      <form onSubmit={submit} className="space-y-5">
        <Field label="Domain" htmlFor="q-domain">
          <select id="q-domain" className={inputClass} value={domain} onChange={(e) => setDomain(e.target.value as DomainId)}>
            {domains.map((d) =>
            <option key={d.id} value={d.id}>
                {d.name}
              </option>
            )}
          </select>
        </Field>
        <Field label="Question" htmlFor="q-prompt">
          <textarea id="q-prompt" rows={3} className={inputClass} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink">Options · select the correct answer</legend>
          <div className="space-y-2">
            {options.map((o, i) =>
            <div key={i} className="flex items-center gap-3">
                <input
                type="radio"
                name="correct"
                aria-label={`Option ${String.fromCharCode(65 + i)} is correct`}
                checked={answer === i}
                onChange={() => setAnswer(i)}
                className="h-4 w-4 shrink-0 accent-brand-600" />
              
                <input
                aria-label={`Option ${String.fromCharCode(65 + i)}`}
                className={inputClass}
                value={o}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                onChange={(e) => setOptions((os) => os.map((x, j) => j === i ? e.target.value : x))} />
              
              </div>
            )}
          </div>
        </fieldset>
        <Field label="Explanation shown after answering" htmlFor="q-exp">
          <input id="q-exp" className={inputClass} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-line pt-5">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancel
          </button>
          <button type="submit" disabled={!valid} className={primaryButton}>
            Save question
          </button>
        </div>
      </form>
    </Modal>);

}