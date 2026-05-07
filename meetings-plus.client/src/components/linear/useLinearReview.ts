import { useState } from 'react';
import { API_BASE_URL } from '../../config';

export type Stage = 'form' | 'extracting' | 'review' | 'submitting' | 'done';

export interface LinearIssue {
  title: string;
  description?: string;
  teamId: string;
  projectId?: string;
  stateId?: string;
  labelIds?: string[];
}

export interface ExtractMeta {
  teamId: string;
  projectId?: string;
  states?: { id: string; name: string }[];
  labels?: { id: string; name: string }[];
}

export function useLinearReview() {
  const [stage, setStage] = useState<Stage>('form');
  const [extractedIssues, setExtractedIssues] = useState<LinearIssue[]>([]);
  const [meta, setMeta] = useState<ExtractMeta | null>(null);
  const [rejectedIndices, setRejectedIndices] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  return {
    stage,
    extractedIssues,
    meta,
    rejectedIndices,
    error,
    extract: async (formData: FormData) => {
      const teamId = (formData.get('teamId') as string) ?? '';
      const projectId = (formData.get('projectId') as string) ?? '';
      setError(null);
      setStage('extracting');
      try {
        const res = await fetch(`${API_BASE_URL}/linear/extract`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error('Extract failed');
        const data = await res.json();
        setExtractedIssues(data.issues);
        setMeta({ ...data.meta, teamId, projectId });
        setStage('review');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
        setStage('form');
      }
    },
    toggleIssue: (index: number) => {
      setRejectedIndices(prev => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
      });
    },
    submit: async () => {
      const approved = extractedIssues.filter((_, i) => !rejectedIndices.has(i));
      if (approved.length === 0) {
        setError('No issues approved for submission');
        return;
      }
      setError(null);
      setStage('submitting');
      try {
        const res = await fetch(`${API_BASE_URL}/linear/issues`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ issues: approved, teamId: meta?.teamId ?? '', projectId: meta?.projectId ?? '' }),
        });
        if (!res.ok) throw new Error('Submit failed');
        setStage('done');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
        setStage('review');
      }
    },
    cancel: () => {
      setStage('form');
      setExtractedIssues([]);
      setMeta(null);
      setRejectedIndices(new Set());
    },
    reset: () => {
      setStage('form');
    },
  };
}
