import { useState } from 'react';
import { BUILD_TIME, checkForUpdate, formatBuild } from '../lib/appUpdate';

type Status = 'idle' | 'checking' | 'reloading' | 'latest' | 'offline' | 'unsupported';

const LABEL: Record<Status, string> = {
  idle: 'Проверить обновления',
  checking: 'Проверяем…',
  reloading: 'Обновляем…',
  latest: 'У вас последняя версия ✓',
  offline: 'Нет связи — попробуйте позже',
  unsupported: 'Обновится при следующем запуске',
};

export function UpdateButton({ reload = () => window.location.reload() }: { reload?: () => void }) {
  const [status, setStatus] = useState<Status>('idle');
  const busy = status === 'checking' || status === 'reloading';
  const build = formatBuild(BUILD_TIME);

  const check = async () => {
    if (busy) return;
    setStatus('checking');
    const result = await checkForUpdate().catch(() => 'offline' as const);
    if (result === 'updated') {
      setStatus('reloading');
      reload();
    } else {
      setStatus(result);
    }
  };

  return (
    <div className="update">
      <button type="button" className="update__btn" onClick={check} disabled={busy}>
        <span className={`update__icon ${busy ? 'is-spinning' : ''}`} aria-hidden="true">↻</span>
        {LABEL[status]}
      </button>
      {build && <span className="update__version">версия от {build}</span>}
    </div>
  );
}
