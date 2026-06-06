import type { ChangeEvent, ReactNode, SelectHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface BaseFieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
  id?: string;
}

export function Field({ label, hint, error, children, className, id }: BaseFieldProps) {
  const fieldId = id ?? `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className={`field ${error ? 'field--error' : ''} ${className ?? ''}`}>
      <label className="form-label" htmlFor={fieldId}>{label}</label>
      {hint && <span className="form-hint">{hint}</span>}
      {children}
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string | number;
  onChange: (value: string) => void;
}

export function TextInput({ value, onChange, ...rest }: TextInputProps) {
  return (
    <input
      {...rest}
      className={`text-input ${rest.className ?? ''}`}
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
    />
  );
}

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: number;
  onChange: (value: number) => void;
}

export function NumberInput({ value, onChange, ...rest }: NumberInputProps) {
  return (
    <input
      {...rest}
      type="number"
      className={`text-input ${rest.className ?? ''}`}
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => {
        const n = e.target.value === '' ? 0 : Number(e.target.value);
        onChange(Number.isFinite(n) ? n : 0);
      }}
    />
  );
}

interface SelectProps<T extends string> extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  value: T | '';
  onChange: (value: T) => void;
  options: { value: T; label: string; description?: string; disabled?: boolean }[];
  placeholder?: string;
}

export function Select<T extends string>({ value, onChange, options, placeholder, ...rest }: SelectProps<T>) {
  return (
    <select
      {...rest}
      className={`text-input ${rest.className ?? ''}`}
      value={value}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value as T)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

interface MultiSelectProps<T extends string> {
  value: T[];
  onChange: (value: T[]) => void;
  options: { value: T; label: string; description?: string }[];
  placeholder?: string;
  id?: string;
}

export function MultiSelect<T extends string>({ value, onChange, options, id }: MultiSelectProps<T>) {
  const toggle = (v: T) => {
    if (value.includes(v)) onChange(value.filter(x => x !== v));
    else onChange([...value, v]);
  };
  return (
    <div className="multi-select" id={id} role="group">
      {options.length === 0 && <span className="multi-select__empty">No options available</span>}
      {options.map(opt => {
        const active = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`multi-select__chip ${active ? 'multi-select__chip--active' : ''}`}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
}

export function Textarea({ value, onChange, ...rest }: TextareaProps) {
  return (
    <textarea
      {...rest}
      className={`text-area ${rest.className ?? ''}`}
      value={value}
      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
    />
  );
}

interface CheckboxProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
  id?: string;
}

export function Checkbox({ checked, onChange, label, hint, id }: CheckboxProps) {
  return (
    <div className="checkbox">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)}
      />
      <label htmlFor={id} className="checkbox__label">
        <span>{label}</span>
        {hint && <span className="checkbox__hint">{hint}</span>}
      </label>
    </div>
  );
}
