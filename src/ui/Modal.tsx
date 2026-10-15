import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  children?: ReactNode;
  actions: ReactNode;
}

export function Modal({ open, title, children, actions }: Props) {
  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h2 className="modal__title">{title}</h2>
        {children && <div className="modal__body">{children}</div>}
        <div className="modal__actions">{actions}</div>
      </div>
    </div>
  );
}
