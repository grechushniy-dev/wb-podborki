import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import type { Application, ApplicationStatus, SubmitApplicationPayload } from '@/types';

async function fetchApplications(): Promise<Application[]> {
  const res = await fetch('/api/applications');
  if (!res.ok) throw new Error('Failed to fetch applications');
  const json = await res.json() as { data: Application[] };
  return json.data;
}

async function submitApplication(payload: SubmitApplicationPayload): Promise<Application> {
  const res = await fetch('/api/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), // includes slot_id
  });
  if (!res.ok) {
    const err = await res.json() as { message: string };
    throw new Error(err.message || 'Failed to submit application');
  }
  const json = await res.json() as { data: Application };
  return json.data;
}

async function confirmApplication(id: string): Promise<Application> {
  const res = await fetch(`/api/applications/${id}/confirm`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Failed to confirm application');
  const json = await res.json() as { data: Application };
  return json.data;
}

async function shipApplication(id: string): Promise<Application> {
  const res = await fetch(`/api/applications/${id}/shipped`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Failed to mark as shipped');
  const json = await res.json() as { data: Application };
  return json.data;
}

export function useApplications() {
  return useQuery({
    queryKey: ['applications'],
    queryFn: fetchApplications,
    refetchInterval: 30_000,
  });
}

export function useSubmitApplication() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: submitApplication,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['applications'] });
      void qc.invalidateQueries({ queryKey: ['collections'] });
      message.success('Заявка успешно подана!');
    },
    onError: (err: Error) => {
      message.error(err.message || 'Ошибка при подаче заявки');
    },
  });
}

export function useConfirmApplication() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: confirmApplication,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['applications'] });
      message.success('Участие подтверждено!');
    },
    onError: () => {
      message.error('Ошибка при подтверждении');
    },
  });
}

export function useShipApplication() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: shipApplication,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['applications'] });
      message.success('Отправка товара подтверждена!');
    },
    onError: () => {
      message.error('Ошибка при обновлении статуса');
    },
  });
}

// DEV ONLY — симуляция действий блогера
export function useDevChangeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, post_url }: { id: string; status: ApplicationStatus; post_url?: string }) => {
      const res = await fetch(`/api/dev/applications/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, post_url }),
      });
      if (!res.ok) throw new Error('Dev status change failed');
      const json = await res.json() as { data: Application };
      return json.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}
