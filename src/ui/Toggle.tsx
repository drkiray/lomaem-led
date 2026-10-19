import { useFeedback } from '../audio/useFeedback';

interface Props {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ label, checked, onChange }: Props) {
  const fx = useFeedback();
  return (
    <button type="button" role="switch" aria-checked={checked} className="toggle" onClick={() => {
      fx.sfx('toggle');
      onChange(!checked);
    }}>
      <span className="toggle__label">{label}</span>
      <span className="toggle__track">
        <span className="toggle__thumb" />
      </span>
    </button>
  );
}
