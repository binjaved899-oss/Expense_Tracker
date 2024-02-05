import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  leftIcon,
  rightIcon,
  className = '',
  children,
  ...props
}) => {
  const sizeCls =
    size === 'sm'
      ? 'px-3 py-1.5 text-xs min-h-[32px]'
      : size === 'lg'
      ? 'px-5 py-2.5 text-base min-h-[44px]'
      : 'px-4 py-2 text-sm min-h-[38px]';
  const variantCls =
    variant === 'primary'
      ? 'bg-[var(--accent-primary)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)] border border-transparent'
      : variant === 'danger'
      ? 'bg-[var(--danger)] text-[var(--accent-text)] border border-transparent'
      : variant === 'ghost'
      ? 'bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] border border-transparent'
      : variant === 'outline'
      ? 'bg-transparent text-[var(--text-primary)] border border-[var(--border-strong)] hover:bg-[var(--bg-tertiary)]'
      : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-strong)]';

  return (
    <button
      type={props.type ?? 'button'}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-md transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed ${sizeCls} ${variantCls} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span>Working...</span>
      ) : (
        <>
          {leftIcon && <span aria-hidden="true">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span aria-hidden="true">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  helperText?: string;
  prefixText?: string;
}

export const Input: React.FC<InputProps> = ({
  id,
  label,
  required,
  error,
  helperText,
  prefixText,
  className = '',
  ...props
}) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-sm font-medium text-[var(--text-primary)]">
      {label} {required && <span aria-hidden="true" className="text-[var(--danger)]">*</span>}
    </label>
    <div className="relative flex items-center">
      {prefixText && (
        <span className="pl-3 pr-1 text-sm text-[var(--text-muted)] select-none">{prefixText}</span>
      )}
      <input
        id={id}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
        className={`w-full px-3 py-2 text-sm rounded-md border bg-[var(--bg-primary)] text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
          error ? 'border-[var(--danger)]' : 'border-[var(--border-default)]'
        } ${className}`}
        {...props}
      />
    </div>
    {error && (
      <p id={`${id}-error`} role="alert" className="text-xs text-[var(--danger)]">
        {error}
      </p>
    )}
    {!error && helperText && (
      <p id={`${id}-helper`} className="text-xs text-[var(--text-muted)]">
        {helperText}
      </p>
    )}
  </div>
);

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select: React.FC<SelectProps> = ({
  id,
  label,
  required,
  options,
  error,
  helperText,
  className = '',
  ...props
}) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-sm font-medium text-[var(--text-primary)]">
      {label} {required && <span aria-hidden="true" className="text-[var(--danger)]">*</span>}
    </label>
    <select
      id={id}
      required={required}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
      className={`w-full px-3 py-2 text-sm rounded-md border bg-[var(--bg-primary)] text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
        error ? 'border-[var(--danger)]' : 'border-[var(--border-default)]'
      } ${className}`}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && (
      <p id={`${id}-error`} role="alert" className="text-xs text-[var(--danger)]">
        {error}
      </p>
    )}
    {!error && helperText && (
      <p id={`${id}-helper`} className="text-xs text-[var(--text-muted)]">
        {helperText}
      </p>
    )}
  </div>
);

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  error?: string;
  helperText?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  id,
  label,
  required,
  error,
  helperText,
  className = '',
  ...props
}) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-sm font-medium text-[var(--text-primary)]">
      {label} {required && <span aria-hidden="true" className="text-[var(--danger)]">*</span>}
    </label>
    <textarea
      id={id}
      required={required}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
      className={`w-full px-3 py-2 text-sm rounded-md border bg-[var(--bg-primary)] text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
        error ? 'border-[var(--danger)]' : 'border-[var(--border-default)]'
      } ${className}`}
      {...props}
    />
    {error && (
      <p id={`${id}-error`} role="alert" className="text-xs text-[var(--danger)]">
        {error}
      </p>
    )}
    {!error && helperText && (
      <p id={`${id}-helper`} className="text-xs text-[var(--text-muted)]">
        {helperText}
      </p>
    )}
  </div>
);

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  description?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ id, label, description, ...props }) => (
  <label htmlFor={id} className="inline-flex items-start gap-2.5 text-sm text-[var(--text-primary)] cursor-pointer">
    <input
      id={id}
      type="checkbox"
      className="mt-0.5 h-4 w-4 rounded border-[var(--border-default)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      {...props}
    />
    <span className="flex flex-col">
      <span className="font-medium">{label}</span>
      {description && <span className="text-xs text-[var(--text-muted)]">{description}</span>}
    </span>
  </label>
);

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  description?: string;
}

export const Radio: React.FC<RadioProps> = ({ id, label, description, ...props }) => (
  <label htmlFor={id} className="inline-flex items-start gap-2.5 text-sm text-[var(--text-primary)] cursor-pointer">
    <input
      id={id}
      type="radio"
      className="mt-0.5 h-4 w-4 border-[var(--border-default)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      {...props}
    />
    <span className="flex flex-col">
      <span className="font-medium">{label}</span>
      {description && <span className="text-xs text-[var(--text-muted)]">{description}</span>}
    </span>
  </label>
);

export interface CardProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  testId?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  actions,
  children,
  className = '',
  testId,
}) => (
  <section
    data-testid={testId}
    className={`rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 md:p-5 ${className}`}
  >
    {(title || subtitle || actions) && (
      <header className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[var(--border-default)]">
        <div>
          {title && <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>}
          {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </header>
    )}
    {children}
  </section>
);

export interface TableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => React.ReactNode;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onSort?: (key: string) => void;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  onSort,
  emptyMessage = 'No records match your current filters.',
  emptyActionLabel,
  onEmptyAction,
}: TableProps<T>) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No Records Found"
        description={emptyMessage}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-[var(--border-default)]">
      <table className="w-full text-left text-sm border-collapse">
        <thead className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
          <tr>
            {columns.map((col) => {
              const alignCls =
                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
              return (
                <th key={col.key} scope="col" className={`px-3 md:px-4 py-3 font-semibold ${alignCls}`}>
                  {col.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className="inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                    >
                      {col.header}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-default)] bg-[var(--bg-primary)]">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="hover:bg-[var(--bg-secondary)]">
              {columns.map((col) => {
                const alignCls =
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                return (
                  <td key={col.key} className={`px-3 md:px-4 py-3 align-middle ${alignCls}`}>
                    {col.render(row)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const Modal: React.FC<{
  isOpen: boolean;
  title: string;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ isOpen, title, onClose, footer, children }) => {
  if (!isOpen) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 md:p-6">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
          <h2 id="modal-title" className="text-lg font-semibold text-[var(--text-primary)]">
            {title}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal">
            Close
          </Button>
        </div>
        <div className="py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-default)]">{footer}</div>
        )}
      </div>
    </div>
  );
};

export const Drawer: React.FC<{
  isOpen: boolean;
  title: string;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ isOpen, title, onClose, footer, children }) => {
  if (!isOpen) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-40 flex justify-end bg-black/40">
      <div className="w-full max-w-md h-full bg-[var(--bg-primary)] border-l border-[var(--border-default)] p-5 md:p-6 flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-default)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close drawer">
            Close
          </Button>
        </div>
        <div className="py-4 flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <div className="pt-3 border-t border-[var(--border-default)] flex justify-end gap-2">{footer}</div>
        )}
      </div>
    </div>
  );
};

export const Toast: React.FC<{
  message: string;
  tone?: 'info' | 'success' | 'warning' | 'error';
  onDismiss?: () => void;
}> = ({ message, tone = 'info', onDismiss }) => (
  <div
    role="status"
    aria-live="polite"
    className={`flex items-center justify-between gap-3 px-4 py-3 rounded-md border text-sm ${
      tone === 'error'
        ? 'bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger)]'
        : tone === 'success'
        ? 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]'
        : tone === 'warning'
        ? 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning)]'
        : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-default)]'
    }`}
  >
    <span>{message}</span>
    {onDismiss && (
      <Button variant="ghost" size="sm" onClick={onDismiss} aria-label="Dismiss notification">
        Dismiss
      </Button>
    )}
  </div>
);

export const Tabs: React.FC<{
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onChange: (id: string) => void;
}> = ({ tabs, activeTab, onChange }) => (
  <div role="tablist" className="flex flex-wrap gap-1.5 border-b border-[var(--border-default)]">
    {tabs.map((t) => (
      <button
        key={t.id}
        role="tab"
        type="button"
        aria-selected={activeTab === t.id}
        onClick={() => onChange(t.id)}
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
          activeTab === t.id
            ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
            : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
        }`}
      >
        <span>{t.label}</span>
        {typeof t.count === 'number' && (
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
            {t.count}
          </span>
        )}
      </button>
    ))}
  </div>
);

export const Breadcrumb: React.FC<{ items: { label: string; onClick?: () => void }[] }> = ({ items }) => (
  <nav aria-label="Breadcrumb" className="text-xs text-[var(--text-muted)]">
    <ol className="flex items-center gap-2 flex-wrap">
      {items.map((item, idx) => (
        <li key={idx} className="inline-flex items-center gap-2">
          {idx > 0 && <span aria-hidden="true">/</span>}
          {item.onClick ? (
            <button
              type="button"
              onClick={item.onClick}
              className="hover:underline text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              {item.label}
            </button>
          ) : (
            <span aria-current="page" className="font-medium text-[var(--text-primary)]">
              {item.label}
            </span>
          )}
        </li>
      ))}
    </ol>
  </nav>
);

export const Pagination: React.FC<{
  page: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
}> = ({ page, totalPages, totalItems, onPageChange }) => (
  <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-2 pt-3">
    <span className="text-xs text-[var(--text-muted)]">
      Page {page} of {Math.max(1, totalPages)}
      {typeof totalItems === 'number' ? ` (${totalItems} items)` : ''}
    </span>
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </Button>
      <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Next
      </Button>
    </div>
  </nav>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <div className="flex flex-col items-center justify-center text-center p-6 md:p-8 rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-secondary)]">
    <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
    <p className="mt-1 text-sm text-[var(--text-muted)] max-w-md">{description}</p>
    {actionLabel && onAction && (
      <div className="mt-4">
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    )}
  </div>
);

export const SkeletonLoader: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div role="status" aria-label="Loading content" className="space-y-3 py-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-6 w-full rounded bg-[var(--bg-tertiary)] opacity-70" />
    ))}
  </div>
);

export const Avatar: React.FC<{ name: string; roleLabel?: string; size?: 'sm' | 'md' }> = ({
  name,
  roleLabel,
  size = 'md',
}) => {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const dim = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm';
  return (
    <div className="inline-flex items-center gap-2">
      <span
        aria-label={name}
        className={`inline-flex items-center justify-center rounded-full font-semibold bg-[var(--accent-primary)] text-[var(--accent-text)] ${dim}`}
      >
        {initials || 'ET'}
      </span>
      {roleLabel && <span className="text-xs text-[var(--text-muted)] hidden sm:inline">{roleLabel}</span>}
    </div>
  );
};

export const Badge: React.FC<{
  label: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
}> = ({ label, tone = 'neutral' }) => {
  const toneCls =
    tone === 'accent'
      ? 'bg-[var(--accent-primary)] text-[var(--accent-text)]'
      : tone === 'success'
      ? 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]'
      : tone === 'warning'
      ? 'bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]'
      : tone === 'danger'
      ? 'bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]'
      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-default)]';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${toneCls}`}>
      {label}
    </span>
  );
};
