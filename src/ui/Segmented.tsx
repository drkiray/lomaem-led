import { useFeedback } from '../audio/useFeedback';

interface Props<T extends string | number> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function Segmented<T extends string | number>({ label, options, value, onChange }: Props<T>) {
  const fx = useFeedback();
  return (
    <div className="field" role="group" aria-label={label}>
      <span className="field__label">{label}</span>
      <div className="segmented">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            className={`segmented__item ${o.value === value ? 'is-active' : ''}`}
            aria-pressed={o.value === value}
            onClick={() => {
              fx.sfx('toggle');
              onChange(o.value);
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
