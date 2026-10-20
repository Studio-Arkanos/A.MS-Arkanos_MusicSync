import type { ButtonHTMLAttributes } from 'react';

/** Bouton principal tactile (≥ 48 px), doré, avec raison de désactivation. */
export function PrimaryButton({
  children,
  disabled,
  disabledReason,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  disabledReason?: string;
}) {
  return (
    <div className="primary-button-wrapper">
      <button type="button" className="btn-primary" disabled={disabled} {...rest}>
        {children}
      </button>
      {disabled && disabledReason ? (
        <p className="primary-button-reason">{disabledReason}</p>
      ) : null}
    </div>
  );
}
