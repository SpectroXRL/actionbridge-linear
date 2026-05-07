import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLinearReview } from './useLinearReview';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

const mockExtractSuccess = (issues = [{ title: 'Issue 1', teamId: 't1' }], meta = { teamId: 't1' }) => {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ issues, meta }),
  } as Response);
};

describe('useLinearReview', () => {
  it('initial stage is "form"', () => {
    const { result } = renderHook(() => useLinearReview());
    expect(result.current.stage).toBe('form');
  });

  it('extract() transitions to "review" with issues on success', async () => {
    const { result } = renderHook(() => useLinearReview());
    const issues = [{ title: 'Issue 1', teamId: 't1' }];
    const serverMeta = { states: [], labels: [] };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ issues, meta: serverMeta }),
    } as Response);

    const fd = new FormData();
    fd.set('teamId', 't1');
    fd.set('projectId', 'p1');
    await act(async () => {
      await result.current.extract(fd);
    });

    expect(result.current.stage).toBe('review');
    expect(result.current.extractedIssues).toEqual(issues);
    expect(result.current.meta).toEqual({ ...serverMeta, teamId: 't1', projectId: 'p1' });
  });

  it('extract() returns to "form" and sets error on failure', async () => {
    const { result } = renderHook(() => useLinearReview());
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
    } as Response);

    await act(async () => {
      await result.current.extract(new FormData());
    });

    expect(result.current.stage).toBe('form');
    expect(result.current.error).toBeTruthy();
  });

  it('toggleIssue(i) adds index when absent, removes when present', () => {
    const { result } = renderHook(() => useLinearReview());

    act(() => result.current.toggleIssue(2));
    expect(result.current.rejectedIndices.has(2)).toBe(true);

    act(() => result.current.toggleIssue(2));
    expect(result.current.rejectedIndices.has(2)).toBe(false);
  });

  it('cancel() from "review" transitions to "form" and clears issues, meta, rejectedIndices', async () => {
    const { result } = renderHook(() => useLinearReview());
    mockExtractSuccess();

    await act(async () => {
      await result.current.extract(new FormData());
    });
    act(() => result.current.toggleIssue(0));
    act(() => result.current.cancel());

    expect(result.current.stage).toBe('form');
    expect(result.current.extractedIssues).toEqual([]);
    expect(result.current.meta).toBeNull();
    expect(result.current.rejectedIndices.size).toBe(0);
  });

  it('submit() with zero approved issues sets error without fetching', async () => {
    const { result } = renderHook(() => useLinearReview());
    const issues = [{ title: 'A', teamId: 't1' }, { title: 'B', teamId: 't1' }];
    mockExtractSuccess(issues);

    await act(async () => {
      await result.current.extract(new FormData());
    });
    // reject all
    act(() => {
      result.current.toggleIssue(0);
      result.current.toggleIssue(1);
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.stage).toBe('review');
    expect(fetch).toHaveBeenCalledTimes(1); // only the extract call
  });

  it('submit() POSTs only approved issues with teamId and projectId, and transitions to "done"', async () => {
    const { result } = renderHook(() => useLinearReview());
    const issues = [
      { title: 'Keep', teamId: 't1' },
      { title: 'Reject', teamId: 't1' },
    ];
    mockExtractSuccess(issues);
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);

    const fd = new FormData();
    fd.set('teamId', 't1');
    fd.set('projectId', 'p1');
    await act(async () => {
      await result.current.extract(fd);
    });
    act(() => result.current.toggleIssue(1)); // reject index 1

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.stage).toBe('done');
    const submitCall = vi.mocked(fetch).mock.calls[1];
    const body = JSON.parse(submitCall[1]?.body as string);
    expect(body.issues).toEqual([{ title: 'Keep', teamId: 't1' }]);
    expect(body.teamId).toBe('t1');
    expect(body.projectId).toBe('p1');
  });

  it('submit() stays on "review" and sets error on fetch failure', async () => {
    const { result } = renderHook(() => useLinearReview());
    mockExtractSuccess();
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);

    await act(async () => {
      await result.current.extract(new FormData());
    });
    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.stage).toBe('review');
    expect(result.current.error).toBeTruthy();
  });

  it('reset() from "done" transitions back to "form"', async () => {
    const { result } = renderHook(() => useLinearReview());
    mockExtractSuccess();
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);

    await act(async () => {
      await result.current.extract(new FormData());
    });
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.stage).toBe('done');

    act(() => result.current.reset());

    expect(result.current.stage).toBe('form');
  });
});

