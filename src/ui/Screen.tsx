import type { ReactNode } from 'react';

interface Props {
  title: string;
  onBack?: () => void;
  actions?: ReactNode;
  children: ReactNode;
}

export function Screen({ title, onBack, actions, children }: Props) {
  return (
    <section className="screen">
      <header className="screen__header">
        {onBack ? (
          <button type="button" className="icon-btn" aria-label="Назад" onClick={onBack}>
            ←
          </button>
        ) : (
          <span className="icon-btn icon-btn--placeholder" />
        )}
        <h1 className="screen__title">{title}</h1>
        <div className="screen__actions">{actions}</div>
      </header>
      <div className="screen__body">{children}</div>
    </section>
  );
}
