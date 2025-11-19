import React, { useEffect, useMemo, useState } from 'react';
import { ActionDefinition, ActionOutcome } from '../lib/types';

interface Props {
  action: ActionDefinition;
}

type FormState = Record<string, string | boolean>;

type Status = 'idle' | 'pending' | 'success' | 'error';

const initValues = (fields: ActionDefinition['fields']): FormState => {
  const next: FormState = {};
  fields.forEach((field) => {
    if (field.type === 'checkbox') {
      next[field.name] = Boolean(field.defaultValue);
    } else if (typeof field.defaultValue === 'string') {
      next[field.name] = field.defaultValue;
    } else {
      next[field.name] = '';
    }
  });
  return next;
};

export const ActionCard: React.FC<Props> = ({ action }) => {
  const [values, setValues] = useState<FormState>(() => initValues(action.fields));
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setValues(initValues(action.fields));
  }, [action.fields]);

  const missingFields = useMemo(() =>
    action.fields
      .filter((field) => field.type !== 'checkbox' && field.required !== false)
      .filter((field) => !values[field.name] || values[field.name] === ''),
  [action.fields, values]);

  const onChange = (name: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (action.disabled) {
      return;
    }
    if (missingFields.length) {
      setStatus('error');
      setMessage(`Missing fields: ${missingFields.map((f) => f.label).join(', ')}`);
      return;
    }
    setStatus('pending');
    setMessage('');
    try {
      const outcome = (await action.onSubmit(values)) as ActionOutcome;
      if (outcome?.message) {
        setMessage(outcome.message);
      } else if (outcome?.txHash) {
        setMessage(`Broadcasted tx: ${outcome.txHash}`);
      } else {
        setMessage('Submitted');
      }
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to submit');
    }
  };

  return (
    <div className="action-card">
      <form onSubmit={handleSubmit}>
        <div className="action-meta">
          <h3>{action.title}</h3>
          <span className="status-pill">{status}</span>
        </div>
        {action.description && <p className="helper-text">{action.description}</p>}
        {action.fields.map((field) => (
          <div key={field.name}>
            <label htmlFor={`${action.key}-${field.name}`}>{field.label}</label>
            {field.type === 'textarea' && (
              <textarea
                id={`${action.key}-${field.name}`}
                value={(values[field.name] as string) ?? ''}
                placeholder={field.placeholder}
                onChange={(event) => onChange(field.name, event.target.value)}
              />
            )}
            {field.type === 'text' && (
              <input
                type="text"
                id={`${action.key}-${field.name}`}
                value={(values[field.name] as string) ?? ''}
                placeholder={field.placeholder}
                onChange={(event) => onChange(field.name, event.target.value)}
              />
            )}
            {field.type === 'number' && (
              <input
                type="number"
                id={`${action.key}-${field.name}`}
                value={(values[field.name] as string) ?? ''}
                placeholder={field.placeholder}
                onChange={(event) => onChange(field.name, event.target.value)}
              />
            )}
            {field.type === 'select' && (
              <select
                id={`${action.key}-${field.name}`}
                value={(values[field.name] as string) ?? ''}
                onChange={(event) => onChange(field.name, event.target.value)}
              >
                <option value="">Select</option>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
            {field.type === 'checkbox' && (
              <input
                type="checkbox"
                id={`${action.key}-${field.name}`}
                checked={Boolean(values[field.name])}
                onChange={(event) => onChange(field.name, event.target.checked)}
              />
            )}
            {field.helperText && <p className="helper-text">{field.helperText}</p>}
          </div>
        ))}
        {action.disabled && action.disabledReason && (
          <p className="helper-text">{action.disabledReason}</p>
        )}
        <div className="card-footer">
          <button className="primary" type="submit" disabled={action.disabled || status === 'pending'}>
            {action.ctaLabel ?? 'Submit'}
          </button>
          {message && <span className="helper-text">{message}</span>}
        </div>
      </form>
    </div>
  );
};
