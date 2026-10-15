import { Screen } from '../ui/Screen';
import { useNav } from './nav';

export function ComingSoon() {
  const { back } = useNav();
  return (
    <Screen title="Скоро" onBack={back}>
      <p className="muted center">Этот экран ещё в разработке.</p>
    </Screen>
  );
}
