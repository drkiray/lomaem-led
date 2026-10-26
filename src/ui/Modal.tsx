import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  title: string;
  children?: ReactNode;
  actions: ReactNode;
  festive?: boolean;
  /** keep the title for screen readers only */
  hideTitle?: boolean;
  /** shown under the dialog at the bottom of the screen, outside the card */
  below?: ReactNode;
  className?: string;
}

export function Modal({ open, title, children, actions, festive, hideTitle, below, className }: Props) {
  if (!open) return null;
  // Portalled to <body>: inside the screen, the entry animation's transform
  // would become the fixed backdrop's containing block and the dialog would
  // jump once the animation ends.
  return createPortal(
    <div className="modal-backdrop">
      <div className={['modal', festive && 'modal--festive', className].filter(Boolean).join(' ')} role="dialog" aria-modal="true" aria-label={title}>
        {!hideTitle && <h2 className="modal__title">{title}</h2>}
        {children && <div className="modal__body">{children}</div>}
        <div className="modal__actions">{actions}</div>
      </div>
      {below && <div className="modal-below">{below}</div>}
    </div>,
    document.body,
  );
}
