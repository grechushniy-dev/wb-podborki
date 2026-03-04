import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar, Button, Divider, Empty, Modal, Popconfirm,
  Select, Space, Tag, Tooltip, Typography,
} from 'antd';
import { App } from 'antd';
import {
  CalendarOutlined, DownOutlined, FrownOutlined,
  LinkOutlined, RightOutlined, SendOutlined, SmileOutlined,
  StarFilled, EyeOutlined, TeamOutlined, UserOutlined, VideoCameraOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Application, ApplicationStatus, BloggerSlot, Collection } from '@/types';
import { useApplications, useConfirmApplication, useShipApplication } from '@/api/applications';
import { useCollections } from '@/api/collections';
import { useAllSellerProducts } from '@/api/seller';
import { useCollectionsStore } from '@/store/collectionsStore';
import { applicationStatusConfig, collectionStatusConfig } from '@/utils/statusConfig';
import { ShipModal } from './ShipModal';

const EMPTY_FILTERS = { themes: [], dateRange: null as null, search: '', priceRange: null as null };

const STATUS_OPTIONS = [
  { value: 'all', label: 'Все статусы' },
  { value: 'pending', label: 'Ожидает одобрения' },
  { value: 'approved', label: 'Одобрена' },
  { value: 'confirmed', label: 'Нужно отправить товар' },
  { value: 'shipped', label: 'Подготовка контента' },
  { value: 'rejected', label: 'Отклонена' },
  { value: 'published', label: 'Видео опубликовано' },
  { value: 'completed', label: 'Размещение завершено' },
];

// ── Column proportions (shared between header and rows) ───────────────────────
// avatar(fixed) | blogger | status | categories | price | pubdate | action
const COL = {
  avatar: 36,     // px fixed
  blogger: 20,    // flex
  status: 18,     // flex
  categories: 20, // flex
  price: 11,      // flex
  pubdate: 12,    // flex
  action: 10,     // flex
};

function colStyle(flex: number, align: 'left' | 'right' | 'center' = 'left') {
  return { flex, textAlign: align as React.CSSProperties['textAlign'], minWidth: 0 };
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')} млн`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} тыс.`;
  return String(n);
}

// ── Rejection modal ───────────────────────────────────────────────────────────

function RejectionModal({
  open, application, onClose, onGoToCollections,
}: {
  open: boolean;
  application: Application | null;
  onClose: () => void;
  onGoToCollections: () => void;
}) {
  return (
    <Modal open={open} onCancel={onClose} footer={null} width={460} centered closable>
      <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
        <div style={{ fontSize: 52, marginBottom: 12, lineHeight: 1 }}>
          <FrownOutlined style={{ color: '#d9d9d9' }} />
        </div>
        <Typography.Title level={4} style={{ margin: '0 0 8px' }}>
          В этот раз не выбрали
        </Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 14 }}>
          Блогер {application?.blogger_name ? `«${application.blogger_name}»` : ''} выбрал других участников
          {application?.collection_title ? ` в подборке «${application.collection_title}»` : ''}.
        </Typography.Text>
      </div>

      <Divider style={{ margin: '0 0 20px' }} />

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <SmileOutlined style={{ color: '#6B4EFF', fontSize: 16, flexShrink: 0 }} />
          <Typography.Text strong style={{ fontSize: 14 }}>Как повысить шансы в следующий раз</Typography.Text>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 24 }}>
          {[
            'Предложите цену выше минимальной — блогеры замечают щедрые ставки',
            'Добавьте несколько товаров на выбор, чтобы дать блогеру больше вариантов',
            'Предложите подарить товар — это весомый плюс к заявке',
            'Участвуйте в подборках, где ещё много свободных мест',
          ].map(tip => (
            <div key={tip} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ color: '#6B4EFF', fontWeight: 700, flexShrink: 0 }}>·</span>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>{tip}</Typography.Text>
            </div>
          ))}
        </div>
      </div>

      {application && (() => {
        const rejectedDate = application.rejected_at || application.created_at;
        const deleteDate = dayjs(rejectedDate).add(30, 'day');
        const daysLeft = deleteDate.diff(dayjs(), 'day');
        return (
          <div style={{
            background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 6,
            padding: '8px 12px', marginBottom: 20, fontSize: 12, color: '#ad6800',
          }}>
            Заявка будет автоматически удалена через {daysLeft} дн. ({deleteDate.format('D MMM YYYY')})
          </div>
        );
      })()}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <Button onClick={onClose}>Закрыть</Button>
        <Button type="primary" icon={<SendOutlined />} onClick={onGoToCollections}>
          Участвовать в других подборках
        </Button>
      </div>
    </Modal>
  );
}

// ── Table header ──────────────────────────────────────────────────────────────

function AppTableHeader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 4px 8px', borderBottom: '2px solid #f0f0f0', marginBottom: 4,
    }}>
      <div style={{ width: COL.avatar, flexShrink: 0 }} />
      <Typography.Text type="secondary" style={{ fontSize: 11, ...colStyle(COL.blogger) }}>Блогер</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 11, ...colStyle(COL.status) }}>Статус</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 11, ...colStyle(COL.categories) }}>Категории</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 11, ...colStyle(COL.price, 'right') }}>Моя ставка</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 11, ...colStyle(COL.pubdate, 'right') }}>Публикация</Typography.Text>
      <div style={colStyle(COL.action)} />
    </div>
  );
}

// ── Application blogger row ───────────────────────────────────────────────────

function AppBloggerRow({
  app, slot,
  onConfirm, confirming,
  onShip, shipping,
  onRejectionOpen,
}: {
  app: Application;
  slot: BloggerSlot | undefined;
  onConfirm: (id: string) => void;
  confirming: boolean;
  onShip: (app: Application) => void;
  shipping: boolean;
  onRejectionOpen: (app: Application) => void;
}) {
  const navigate = useNavigate();
  const cfg = applicationStatusConfig[app.status];

  const handleClick = () => {
    if (app.status === 'rejected') {
      onRejectionOpen(app);
    } else {
      navigate(`/collections/${app.collection_id}/slots/${app.slot_id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 4px', cursor: 'pointer',
        borderBottom: '1px solid #f5f5f5', borderRadius: 4,
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Avatar */}
      <Avatar
        src={slot?.blogger_avatar ?? app.blogger_avatar}
        icon={<UserOutlined />}
        size={36}
        style={{ flexShrink: 0 }}
      />

      {/* Blogger name + stats */}
      <div style={colStyle(COL.blogger)}>
        <Typography.Text strong style={{ fontSize: 13, display: 'block' }}>
          {slot?.blogger_name ?? app.blogger_name}
        </Typography.Text>
        {slot && (
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            <Typography.Text type="secondary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 2 }}>
              <StarFilled style={{ color: '#faad14' }} />{slot.blogger_rating.toFixed(1)}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 2 }}>
              <EyeOutlined />{formatViews(slot.blogger_avg_views)}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 2 }}>
              <VideoCameraOutlined />{slot.blogger_publications_count}
            </Typography.Text>
          </div>
        )}
      </div>

      {/* Status */}
      <div style={colStyle(COL.status)} onClick={e => e.stopPropagation()}>
        <Tag color={cfg.color} style={{ fontSize: 11, margin: 0 }}>{cfg.label}</Tag>
      </div>

      {/* Categories */}
      <div style={{ ...colStyle(COL.categories), display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {slot?.allowed_categories.slice(0, 2).map(cat => (
          <Tag key={cat} style={{ margin: 0, fontSize: 11 }}>{cat}</Tag>
        ))}
        {slot && slot.allowed_categories.length > 2 && (
          <Tooltip title={slot.allowed_categories.slice(2).join(', ')}>
            <Tag style={{ margin: 0, borderStyle: 'dashed', color: '#888', fontSize: 11 }}>
              +{slot.allowed_categories.length - 2}
            </Tag>
          </Tooltip>
        )}
      </div>

      {/* Price */}
      <Typography.Text strong style={{ fontSize: 13, color: '#6B4EFF', ...colStyle(COL.price, 'right') }}>
        {app.offered_price.toLocaleString('ru-RU')} ₽
      </Typography.Text>

      {/* Publication date */}
      <Typography.Text type="secondary" style={{ fontSize: 12, ...colStyle(COL.pubdate, 'right') }}>
        {dayjs(app.collection_publication_date).format('D MMM YYYY')}
      </Typography.Text>

      {/* Action */}
      <div
        style={{ ...colStyle(COL.action), display: 'flex', justifyContent: 'flex-end' }}
        onClick={e => e.stopPropagation()}
      >
        {app.status === 'approved' && (
          <Popconfirm
            title="Подтвердить участие?"
            onConfirm={() => onConfirm(app.id)}
            okText="Да" cancelText="Отмена"
          >
            <Button size="small" type="primary" loading={confirming}>Подтвердить</Button>
          </Popconfirm>
        )}
        {app.status === 'confirmed' && (
          <Button
            size="small" type="primary" ghost icon={<SendOutlined />}
            loading={shipping} onClick={() => onShip(app)}
          >
            Отправить
          </Button>
        )}
        {(app.status === 'published' || app.status === 'completed') && app.post_url && (
          <Button size="small" icon={<LinkOutlined />} href={app.post_url} target="_blank">
            Публикация
          </Button>
        )}
        {app.status !== 'approved' && app.status !== 'confirmed' &&
          !(app.status === 'published' || app.status === 'completed') && (
            <RightOutlined style={{ color: '#d9d9d9', fontSize: 11 }} />
          )}
      </div>
    </div>
  );
}

// ── Collection group card ─────────────────────────────────────────────────────

function AppCollectionCard({
  collection, apps, isExpanded, onToggle,
  onConfirm, confirming, onShip, shipping, onRejectionOpen,
}: {
  collection: Collection | undefined;
  apps: Application[];
  isExpanded: boolean;
  onToggle: () => void;
  onConfirm: (id: string) => void;
  confirming: boolean;
  onShip: (app: Application) => void;
  shipping: boolean;
  onRejectionOpen: (app: Application) => void;
}) {
  const title = collection?.title ?? apps[0].collection_title;
  const statusCfg = collection ? collectionStatusConfig[collection.status] : null;
  const deadlineDate = collection ? dayjs(collection.deadline_at) : null;
  const daysLeft = deadlineDate ? deadlineDate.diff(dayjs(), 'day') : 99;

  return (
    <div style={{
      border: `1px solid ${isExpanded ? '#6B4EFF' : '#e8e8e8'}`,
      borderRadius: 10, background: '#fff', marginBottom: 12,
      transition: 'border-color 0.15s', overflow: 'hidden',
    }}>
      {/* Card header */}
      <div
        onClick={onToggle}
        style={{
          padding: '16px 20px', cursor: 'pointer',
          background: isExpanded ? '#faf9ff' : '#fff', transition: 'background 0.15s',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <Typography.Text strong style={{ fontSize: 15 }}>{title}</Typography.Text>
          <Space>
            {statusCfg && <Tag color={statusCfg.color} style={{ marginLeft: 8 }}>{statusCfg.label}</Tag>}
            {isExpanded
              ? <DownOutlined style={{ fontSize: 12, color: '#6B4EFF' }} />
              : <RightOutlined style={{ fontSize: 12, color: '#aaa' }} />
            }
          </Space>
        </div>

        {collection && (
          <div style={{ marginBottom: 10 }}>
            {collection.theme_names.slice(0, 3).map(name => (
              <Tag key={name} style={{ marginRight: 4, marginBottom: 0 }}>{name}</Tag>
            ))}
            {collection.theme_names.length > 3 && (
              <Tooltip title={collection.theme_names.slice(3).join(', ')}>
                <Tag style={{ borderStyle: 'dashed', color: '#666' }}>+{collection.theme_names.length - 3}</Tag>
              </Tooltip>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {deadlineDate && (
            <Space size={4}>
              <CalendarOutlined style={{ color: daysLeft <= 3 ? '#ff4d4f' : '#6B4EFF', fontSize: 13 }} />
              <Typography.Text type={daysLeft <= 0 ? 'danger' : undefined} style={{ fontSize: 13 }}>
                Набор до {deadlineDate.format('D MMM YYYY')}
              </Typography.Text>
            </Space>
          )}
          <Space size={4}>
            <TeamOutlined style={{ color: '#8c8c8c', fontSize: 13 }} />
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {apps.length} {apps.length === 1 ? 'блогер' : apps.length <= 4 ? 'блогера' : 'блогеров'}
            </Typography.Text>
          </Space>
        </div>
      </div>

      {/* Expanded list */}
      {isExpanded && (
        <div
          style={{ padding: '8px 20px 12px', borderTop: '1px solid #f0f0f0' }}
          onClick={e => e.stopPropagation()}
        >
          <AppTableHeader />
          {apps.map(app => {
            const slot = collection?.slots.find(s => s.id === app.slot_id);
            return (
              <AppBloggerRow
                key={app.id}
                app={app}
                slot={slot}
                onConfirm={onConfirm}
                confirming={confirming}
                onShip={onShip}
                shipping={shipping}
                onRejectionOpen={onRejectionOpen}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function MyApplicationsTable() {
  const { data: applications = [] } = useApplications();
  const { data: allCollections = [] } = useCollections(EMPTY_FILTERS);
  const { mutate: confirm, isPending: confirming } = useConfirmApplication();
  const { mutate: ship, isPending: shipping } = useShipApplication();
  const { notification } = App.useApp();
  const setPageView = useCollectionsStore(s => s.setPageView);
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [shipTargetApp, setShipTargetApp] = useState<Application | null>(null);
  const { data: allProducts = [] } = useAllSellerProducts();
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectedApp, setRejectedApp] = useState<Application | null>(null);

  // Notify on status changes
  const prevStatusMap = useRef<Map<string, string> | null>(null);
  useEffect(() => {
    if (applications.length === 0) return;
    if (prevStatusMap.current === null) {
      prevStatusMap.current = new Map(applications.map(a => [a.id, a.status]));
      return;
    }
    applications.forEach(app => {
      const prev = prevStatusMap.current!.get(app.id);
      if (prev === app.status) return;
      if (app.status === 'approved') {
        notification.info({
          message: 'Заявка одобрена!',
          description: `Блогер одобрил вашу заявку на подборку «${app.collection_title}». Подтвердите участие.`,
          duration: 8,
        });
      } else if (app.status === 'rejected') {
        notification.warning({
          message: 'Заявка отклонена',
          description: `Блогер отклонил вашу заявку на подборку «${app.collection_title}».`,
          duration: 8,
        });
      }
    });
    prevStatusMap.current = new Map(applications.map(a => [a.id, a.status]));
  }, [applications, notification]);

  const collectionMap = useMemo(
    () => new Map(allCollections.map(c => [c.id, c])),
    [allCollections],
  );

  const filtered = statusFilter === 'all'
    ? applications
    : applications.filter(a => a.status === statusFilter);

  const groups = useMemo(() => {
    const map = new Map<string, Application[]>();
    filtered.forEach(app => {
      if (!map.has(app.collection_id)) map.set(app.collection_id, []);
      map.get(app.collection_id)!.push(app);
    });
    return Array.from(map.entries()).map(([collectionId, apps]) => ({
      collectionId,
      collection: collectionMap.get(collectionId),
      apps,
    }));
  }, [filtered, collectionMap]);

  const handleConfirm = (id: string) => {
    confirm(id, { onSuccess: () => setPageView('all') });
  };
  const handleShip = (app: Application) => {
    setShipTargetApp(app);
    setShipModalOpen(true);
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
          style={{ width: 220 }}
        />
        {statusFilter !== 'all' && (
          <Button size="small" onClick={() => setStatusFilter('all')}>Сбросить</Button>
        )}
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Показано: {filtered.length} из {applications.length}
        </Typography.Text>
      </Space>

      {groups.length === 0 ? (
        <Empty description="Нет заявок с выбранным статусом" style={{ marginTop: 32 }} />
      ) : (
        <div>
          {groups.map(({ collectionId, collection, apps }) => (
            <AppCollectionCard
              key={collectionId}
              collection={collection}
              apps={apps}
              isExpanded={expandedId === collectionId}
              onToggle={() => setExpandedId(prev => prev === collectionId ? null : collectionId)}
              onConfirm={handleConfirm}
              confirming={confirming}
              onShip={handleShip}
              shipping={shipping}
              onRejectionOpen={app => { setRejectedApp(app); setRejectionModalOpen(true); }}
            />
          ))}
        </div>
      )}

      <ShipModal
        open={shipModalOpen}
        applicationId={shipTargetApp?.id ?? null}
        products={shipTargetApp ? allProducts.filter(p => shipTargetApp.gift_product_ids.includes(p.id)) : []}
        giftProductIds={shipTargetApp?.gift_product_ids ?? []}
        onConfirm={() => {
          if (shipTargetApp) ship(shipTargetApp.id, { onSuccess: () => { setShipModalOpen(false); setShipTargetApp(null); } });
        }}
        onCancel={() => { setShipModalOpen(false); setShipTargetApp(null); }}
        loading={shipping}
      />

      <RejectionModal
        open={rejectionModalOpen}
        application={rejectedApp}
        onClose={() => { setRejectionModalOpen(false); setRejectedApp(null); }}
        onGoToCollections={() => {
          setRejectionModalOpen(false);
          setRejectedApp(null);
          navigate('/collections');
          setPageView('all');
        }}
      />
    </div>
  );
}
