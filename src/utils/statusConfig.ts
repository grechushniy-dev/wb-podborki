import type { ApplicationStatus, CollectionStatus } from '@/types';

type TagColor = 'processing' | 'warning' | 'success' | 'cyan' | 'error' | 'green' | 'purple' | 'default';

export const applicationStatusConfig: Record<ApplicationStatus, { color: TagColor; label: string }> = {
  pending: { color: 'processing', label: 'Ожидает одобрения' },
  approved: { color: 'warning', label: 'Одобрена блогером' },
  confirmed: { color: 'success', label: 'Подтверждена' },
  shipped: { color: 'cyan', label: 'Подготовка контента' },
  rejected: { color: 'error', label: 'Отклонена' },
  published: { color: 'purple', label: 'Видео опубликовано' },
  completed: { color: 'green', label: 'Размещение завершено' },
};

export const collectionStatusConfig: Record<CollectionStatus, { color: TagColor; label: string }> = {
  draft: { color: 'default', label: 'Черновик' },
  moderation: { color: 'processing', label: 'На модерации' },
  active: { color: 'success', label: 'Активна' },
  closed: { color: 'default', label: 'Набор закрыт' },
  archived: { color: 'default', label: 'Архив' },
};
