import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert, Avatar, Button, Card, Divider, Popconfirm,
  Skeleton, Space, Table, Tag, Tooltip, Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  ArrowLeftOutlined, ArrowRightOutlined, CalendarOutlined, CheckCircleOutlined,
  EyeOutlined, InfoCircleOutlined, LinkOutlined, SendOutlined,
  StarFilled, UserOutlined, VideoCameraOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useCollection } from '@/api/collections';
import { useApplications, useConfirmApplication, useShipApplication } from '@/api/applications';
import { ShipModal } from '@/components/applications/ShipModal';
import { applicationStatusConfig, collectionStatusConfig } from '@/utils/statusConfig';
import { ApplyModal } from './ApplyModal';
import type { Application, BloggerSlot } from '@/types';

const { Title, Text, Link, Paragraph } = Typography;

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')} млн`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} тыс.`;
  return String(n);
}

export function CollectionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: collection, isLoading, isError } = useCollection(id ?? null);
  const { data: applications = [] } = useApplications();
  const { mutate: confirm, isPending: confirming } = useConfirmApplication();
  const { mutate: ship, isPending: shipping } = useShipApplication();

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<BloggerSlot | null>(null);
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [shipAppId, setShipAppId] = useState<string | null>(null);

  const isDeadlinePassed = collection ? dayjs().isAfter(dayjs(collection.deadline_at)) : false;

  // Map slot_id → application for quick lookup
  const appBySlot = new Map<string, Application>(
    applications
      .filter(a => a.collection_id === id)
      .map(a => [a.slot_id, a])
  );

  const handleApplyClick = (slot: BloggerSlot) => {
    setSelectedSlot(slot);
    setApplyModalOpen(true);
  };

  const columns: TableColumnsType<BloggerSlot> = [
    {
      title: 'Блогер',
      key: 'blogger',
      width: 220,
      render: (_: unknown, slot: BloggerSlot) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar src={slot.blogger_avatar} icon={<UserOutlined />} size={38} />
          <div>
            <Link
              href={slot.blogger_profile_url}
              target="_blank"
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.88)' }}
            >
              {slot.blogger_name}
              <ArrowRightOutlined style={{ fontSize: 10, marginLeft: 4, color: '#aaa' }} />
            </Link>
            <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
              <Text type="secondary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                <StarFilled style={{ color: '#faad14' }} />
                {slot.blogger_rating.toFixed(1)}
              </Text>
              <Text type="secondary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                <EyeOutlined />
                {formatViews(slot.blogger_avg_views)}
              </Text>
              <Text type="secondary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                <VideoCameraOutlined />
                {slot.blogger_publications_count}
              </Text>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Категории товаров',
      key: 'categories',
      width: 200,
      render: (_: unknown, slot: BloggerSlot) => (
        <Space size={4} wrap>
          {slot.allowed_categories.slice(0, 2).map(cat => (
            <Tag key={cat} style={{ margin: 0, fontSize: 11 }}>{cat}</Tag>
          ))}
          {slot.allowed_categories.length > 2 && (
            <Tooltip title={slot.allowed_categories.slice(2).join(', ')}>
              <Tag style={{ margin: 0, borderStyle: 'dashed', color: '#888', fontSize: 11 }}>
                +{slot.allowed_categories.length - 2}
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Цена за слот',
      key: 'price',
      width: 130,
      sorter: (a, b) => a.price_per_slot - b.price_per_slot,
      render: (_: unknown, slot: BloggerSlot) => (
        <Text strong style={{ color: '#6B4EFF' }}>
          {slot.price_per_slot.toLocaleString('ru-RU')} ₽
        </Text>
      ),
    },
    {
      title: 'Мест',
      key: 'slots',
      width: 90,
      sorter: (a, b) => a.available_slots - b.available_slots,
      render: (_: unknown, slot: BloggerSlot) => (
        <Text type={slot.available_slots === 0 ? 'danger' : undefined} style={{ fontSize: 13 }}>
          {slot.available_slots}
          <Text type="secondary" style={{ fontSize: 11 }}> / {slot.total_slots}</Text>
        </Text>
      ),
    },
    {
      title: 'Дата публикации',
      key: 'publication_date',
      width: 140,
      sorter: (a, b) => a.publication_date.localeCompare(b.publication_date),
      defaultSortOrder: 'ascend',
      render: (_: unknown, slot: BloggerSlot) => (
        <Text style={{ fontSize: 13 }}>{dayjs(slot.publication_date).format('D MMM YYYY')}</Text>
      ),
    },
    {
      title: 'Действие',
      key: 'action',
      width: 200,
      render: (_: unknown, slot: BloggerSlot) => {
        const app = appBySlot.get(slot.id);

        if (app) {
          const cfg = applicationStatusConfig[app.status];
          return (
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Tag color={cfg.color} style={{ fontSize: 12 }}>{cfg.label}</Tag>
              {app.status === 'approved' && (
                <Popconfirm
                  title="Подтвердить участие?"
                  description="Вы уверены, что хотите подтвердить участие?"
                  onConfirm={() => confirm(app.id)}
                  okText="Да"
                  cancelText="Отмена"
                >
                  <Button size="small" type="primary" loading={confirming} onClick={e => e.stopPropagation()}>
                    Подтвердить участие
                  </Button>
                </Popconfirm>
              )}
              {app.status === 'confirmed' && (
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<SendOutlined />}
                  loading={shipping}
                  onClick={e => { e.stopPropagation(); setShipAppId(app.id); setShipModalOpen(true); }}
                >
                  Отправить товар
                </Button>
              )}
              {(app.status === 'published' || app.status === 'completed') && app.post_url && (
                <Button
                  size="small"
                  icon={<LinkOutlined />}
                  href={app.post_url}
                  target="_blank"
                  onClick={e => e.stopPropagation()}
                >
                  Смотреть публикацию
                </Button>
              )}
            </Space>
          );
        }

        if (isDeadlinePassed) {
          return <Text type="secondary" style={{ fontSize: 12 }}>Набор завершён</Text>;
        }
        if (slot.available_slots === 0) {
          return <Text type="secondary" style={{ fontSize: 12 }}>Все места заняты</Text>;
        }

        return (
          <Button
            size="small"
            type="primary"
            onClick={e => { e.stopPropagation(); handleApplyClick(slot); }}
          >
            Подать заявку
          </Button>
        );
      },
    },
  ];

  const cardBody = { body: { padding: '16px 20px' } };

  return (
    <div style={{ padding: '24px 32px 48px' }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/collections')}
        style={{ marginBottom: 20, padding: 0, color: '#888' }}
      >
        Назад к подборкам
      </Button>

      {isLoading && <Skeleton active paragraph={{ rows: 16 }} />}

      {isError && (
        <Alert
          type="error"
          message="Подборка не найдена"
          description="Возможно, она была удалена или ссылка неверна."
          showIcon
        />
      )}

      {!isLoading && collection && (() => {
        const statusCfg = collectionStatusConfig[collection.status];
        const deadlineDate = dayjs(collection.deadline_at);
        const daysLeft = deadlineDate.diff(dayjs(), 'day');

        return (
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>

            {/* ── Заголовок ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <Tag color={statusCfg.color}>{statusCfg.label}</Tag>
                <Space size={4}>
                  <CalendarOutlined style={{ color: daysLeft <= 3 ? '#ff4d4f' : '#6B4EFF', fontSize: 13 }} />
                  <Text
                    type={daysLeft <= 0 ? 'danger' : undefined}
                    style={{ fontSize: 13 }}
                  >
                    {isDeadlinePassed
                      ? `Набор завершён ${deadlineDate.format('D MMM YYYY')}`
                      : `Набор до ${deadlineDate.format('D MMM YYYY')}${daysLeft <= 7 ? ` (ещё ${daysLeft} дн.)` : ''}`
                    }
                  </Text>
                </Space>
              </div>
              <Title level={3} style={{ margin: '0 0 10px' }}>{collection.title}</Title>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {collection.theme_names.map(name => (
                  <span
                    key={name}
                    style={{
                      background: '#f0f0f0', color: '#555', fontSize: 12,
                      padding: '2px 10px', borderRadius: 4,
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>

            {/* ── О подборке + формат публикации ── */}
            <Card style={{ borderRadius: 8, marginBottom: 20 }} styles={cardBody}>
              <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>
                О подборке
              </Text>
              <Paragraph style={{ color: '#555', margin: '0 0 16px' }}>{collection.description}</Paragraph>

              <Divider style={{ margin: '0 0 14px' }} />

              <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 12 }}>
                Формат публикации
              </Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  {
                    title: 'Одно видео — общий обзор товаров',
                    tooltip: 'Блогер снимает единый ролик, в котором представляет все товары подборки. Каждый продукт получает экранное время с демонстрацией и описанием характеристик.',
                  },
                  {
                    title: 'Финальное видео вы не увидите до публикации',
                    tooltip: 'Это стандартный формат работы с авторами. Мы проверим ролик за вас: оценим качество съёмки, убедимся, что ваш товар представлен корректно и достойно. Если что-то пойдёт не так — разберёмся до выхода.',
                  },
                ].map(item => (
                  <div key={item.title} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <CheckCircleOutlined style={{ color: '#6B4EFF', flexShrink: 0 }} />
                    <Text style={{ fontSize: 13 }}>{item.title}</Text>
                    <Tooltip title={item.tooltip} placement="right">
                      <InfoCircleOutlined style={{ color: '#bbb', fontSize: 13, flexShrink: 0, cursor: 'help' }} />
                    </Tooltip>
                  </div>
                ))}
              </div>
            </Card>

            {/* ── Таблица блогеров ── */}
            <Table<BloggerSlot>
              columns={columns}
              dataSource={collection.slots}
              rowKey="id"
              pagination={false}
              scroll={{ x: 900 }}
              bordered={false}
              style={{ background: '#fff', borderRadius: 8, border: '1px solid #e8e8e8' }}
            />
          </div>
        );
      })()}

      {/* Apply modal */}
      {collection && (
        <ApplyModal
          open={applyModalOpen}
          collectionId={collection.id}
          collectionTitle={collection.title}
          slot={selectedSlot}
          onClose={() => { setApplyModalOpen(false); setSelectedSlot(null); }}
        />
      )}

      {/* Ship modal */}
      <ShipModal
        open={shipModalOpen}
        applicationId={shipAppId}
        onConfirm={() => {
          if (shipAppId) ship(shipAppId, { onSuccess: () => { setShipModalOpen(false); setShipAppId(null); } });
        }}
        onCancel={() => { setShipModalOpen(false); setShipAppId(null); }}
        loading={shipping}
      />
    </div>
  );
}
