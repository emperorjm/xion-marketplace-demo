export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'checkbox';

export interface ActionField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  helperText?: string;
  options?: { label: string; value: string }[];
  defaultValue?: string | boolean;
  required?: boolean;
}

export interface ActionOutcome {
  message?: string;
  txHash?: string;
  data?: unknown;
}

export interface ActionDefinition {
  key: string;
  title: string;
  description?: string;
  ctaLabel?: string;
  disabled?: boolean;
  disabledReason?: string;
  fields: ActionField[];
  onSubmit: (values: Record<string, string | boolean>) => Promise<ActionOutcome | void>;
}

export interface LogEntry {
  id: string;
  title: string;
  status: 'success' | 'error';
  detail: string;
  txHash?: string;
  timestamp: string;
}
