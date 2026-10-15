import { act, renderHook } from '@testing-library/react';
import { stubFullscreen, unstubFullscreen } from '../test/fullscreen';
import { useLandscape } from './useLandscape';

afterEach(unstubFullscreen);

test('offers landscape when enabled and supported', () => {
  stubFullscreen();
  const { result } = renderHook(() => useLandscape(true));
  expect(result.current.offer).toBe(true);
});

test('no offer when disabled or when the browser cannot go fullscreen', () => {
  stubFullscreen();
  expect(renderHook(() => useLandscape(false)).result.current.offer).toBe(false);
  unstubFullscreen();
  expect(renderHook(() => useLandscape(true)).result.current.offer).toBe(false);
});

test('enter goes fullscreen, locks landscape and hides the offer', async () => {
  const fs = stubFullscreen();
  const { result } = renderHook(() => useLandscape(true));
  await act(() => result.current.enter());
  expect(fs.requestFullscreen).toHaveBeenCalledWith({ navigationUI: 'hide' });
  expect(fs.lock).toHaveBeenCalledWith('landscape');
  expect(result.current.offer).toBe(false);
  expect(result.current.canEnter).toBe(false);
});

test('a failed orientation lock still leaves the game fullscreen', async () => {
  const fs = stubFullscreen({ lockFails: true });
  const { result } = renderHook(() => useLandscape(true));
  await expect(act(() => result.current.enter())).resolves.not.toThrow();
  expect(fs.requestFullscreen).toHaveBeenCalled();
});

test('decline hides the offer but keeps the fullscreen button', () => {
  stubFullscreen();
  const { result } = renderHook(() => useLandscape(true));
  act(() => result.current.decline());
  expect(result.current.offer).toBe(false);
  expect(result.current.canEnter).toBe(true);
});

test('leaving the game unlocks orientation and exits fullscreen', async () => {
  const fs = stubFullscreen();
  const { result, unmount } = renderHook(() => useLandscape(true));
  await act(() => result.current.enter());
  unmount();
  expect(fs.unlock).toHaveBeenCalled();
  expect(fs.exitFullscreen).toHaveBeenCalled();
});

test('exiting fullscreen by gesture brings the fullscreen button back, not the prompt', async () => {
  const fs = stubFullscreen();
  const { result } = renderHook(() => useLandscape(true));
  await act(() => result.current.enter());
  act(() => fs.leave());
  expect(result.current.canEnter).toBe(true);
  expect(result.current.offer).toBe(false);
});
