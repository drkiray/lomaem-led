import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  title: string;
  children?: ReactNode;
  actions: ReactNode;
  festive?: boolean;
}

export function Modal({ open, title, children, actions, festive }: Props) {
  if (!open) return null;
  // Portalled to <body>: inside the screen, the entry animation's transform
  // would become the fixed backdrop's containing block and the dialog would
  // jump once the animation ends.
  return createPortal(
    <div className="modal-backdrop">
      <div className={festive ? 'modal modal--festive' : 'modal'} role="dialog" aria-modal="true" aria-label={title}>
        <h2 className="modal__title">{title}</h2>
        {children && <div className="modal__body">{children}</div>}
        <div className="modal__actions">{actions}</div>
      </div>
    </div>,
    document.body,
  );
}
