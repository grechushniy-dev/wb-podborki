import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert, Avatar, Button, Card, Checkbox, Divider, InputNumber,
  Modal, Popconfirm, Radio, Skeleton, Space, Steps, Tag, Tooltip, Typography,
} from 'antd';
import {
  ArrowLeftOutlined, ArrowRightOutlined, CalendarOutlined, CheckCircleOutlined,
  EyeOutlined, GiftOutlined, InfoCircleOutlined, LinkOutlined, PlusOutlined, SendOutlined,
  ShoppingOutlined, StarFilled, UserOutlined, VideoCameraOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useCollection } from '@/api/collections';
import { useApplications, useConfirmApplication, useShipApplication, useSubmitApplication } from '@/api/applications';
import { useAllSellerProducts } from '@/api/seller';
import { ShipModal } from '@/components/applications/ShipModal';
import { applicationStatusConfig, collectionStatusConfig } from '@/utils/statusConfig';
import { useCollectionsStore } from '@/store/collectionsStore';
import type { Application, BloggerSlot, Collection, SellerProduct } from '@/types';

const { Title, Text, Link, Paragraph } = Typography;

// ── Constants ─────────────────────────────────────────────────────────────────

const KEY_POINTS = [
  'Подчеркнуть качество товара',
  'Рассказать про удобство использования',
  'Отметить ручную работу мастера',
  'Показать товар в действии',
  'Сравнить с популярными аналогами',
  'Упомянуть долгий срок службы',
  'Отметить экологичность материалов',
  'Показать упаковку и комплектацию',
  'Рассказать про состав / материал',
  'Отметить оригинальный дизайн',
];
const MAX_KEY_POINTS = 4;

const PAYMENT_SOURCES = [
  { value: 'main', label: 'Основной счёт', balance: '125 000 ₽' },
  { value: 'ad', label: 'Рекламный баланс', balance: '45 000 ₽' },
];

const MOCK_POSTS = [
  { id: 'p1', title: 'Обзор новинок этого сезона', views: 28400, thumb: 'https://picsum.photos/seed/post1/300/420' },
  { id: 'p2', title: 'Топ-5 находок с WB', views: 41200, thumb: 'https://picsum.photos/seed/post2/300/420' },
  { id: 'p3', title: 'Честный отзыв: покупаем вместе', views: 19800, thumb: 'https://picsum.photos/seed/post3/300/420' },
];

interface ProductSettings {
  price: number;
  gift: boolean;
  keyPoints: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')} млн`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} тыс.`;
  return String(n);
}

// ── Sidebar: wizard summary ───────────────────────────────────────────────────

function WizardSidebar({
  slot,
  collection,
  selectedCount,
}: {
  slot: BloggerSlot;
  collection: Collection;
  selectedCount: number;
}) {
  const daysLeft = dayjs(collection.deadline_at).diff(dayjs(), 'day');
  const isDeadlinePassed = dayjs().isAfter(dayjs(collection.deadline_at));

  return (
    <Card
      title={<Text strong style={{ fontSize: 14 }}>Итог по заявке</Text>}
      styles={{ body: { padding: '14px 16px' }, header: { padding: '10px 16px', minHeight: 'auto' } }}
      style={{ borderRadius: 8 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>Мин. цена за слот</Text>
          <Text strong style={{ fontSize: 20, color: '#6B4EFF' }}>
            {slot.price_per_slot.toLocaleString('ru-RU')}
            <Text type="secondary" style={{ fontSize: 13, fontWeight: 'normal' }}> ₽</Text>
          </Text>
        </div>

        <Divider style={{ margin: 0 }} />

        <div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
            <CalendarOutlined style={{ marginRight: 4 }} />Дедлайн заявок
          </Text>
          <Text style={{ fontSize: 13, fontWeight: 500 }} type={isDeadlinePassed ? 'danger' : undefined}>
            {dayjs(collection.deadline_at).format('D MMM YYYY')}
          </Text>
          {!isDeadlinePassed && daysLeft >= 0 && daysLeft <= 7 && (
            <Text style={{ fontSize: 12, display: 'block', color: daysLeft <= 3 ? '#ff4d4f' : '#fa8c16' }}>
              Осталось {daysLeft === 0 ? 'меньше дня' : `${daysLeft} дн.`}
            </Text>
          )}
        </div>

        {selectedCount > 0 && (
          <>
            <Divider style={{ margin: 0 }} />
            <div>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>Товаров выбрано</Text>
              <Text strong style={{ fontSize: 18 }}>
                {selectedCount}
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 'normal' }}> из {slot.available_slots}</Text>
              </Text>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

// ── Sidebar: existing application ─────────────────────────────────────────────

function ExistingAppSidebar({
  app,
  onConfirm, confirming,
  shipping,
  onOpenShipModal,
}: {
  app: Application;
  onConfirm: (id: string) => void;
  confirming: boolean;
  shipping: boolean;
  onOpenShipModal: () => void;
}) {
  const cfg = applicationStatusConfig[app.status];

  return (
    <Card
      styles={{ body: { padding: '14px 16px' }, header: { padding: '10px 16px', minHeight: 'auto' } }}
      style={{ borderRadius: 8 }}
    >
      <Tag color={cfg.color} style={{ fontSize: 13, padding: '3px 12px', marginBottom: 14, display: 'inline-block' }}>
        {cfg.label}
      </Tag>

      <Divider style={{ margin: '0 0 12px' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        <div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Моя ставка</Text>
          <Text strong style={{ fontSize: 20 }}>
            {app.offered_price.toLocaleString('ru-RU')}
            <Text type="secondary" style={{ fontSize: 13, fontWeight: 'normal' }}> ₽</Text>
          </Text>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Дата подачи</Text>
          <Text style={{ fontSize: 12, fontWeight: 500 }}>{dayjs(app.created_at).format('D MMM YYYY')}</Text>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Дата публикации</Text>
          <Text style={{ fontSize: 12, fontWeight: 500 }}>{dayjs(app.collection_publication_date).format('D MMM YYYY')}</Text>
        </div>
        {app.gift_product && (
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Подарок блогеру</Text>
            <Text style={{ fontSize: 12, fontWeight: 500 }}>Да</Text>
          </div>
        )}
      </div>

      {app.status === 'approved' && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <Popconfirm
            title="Подтверждение участия"
            description="Вы уверены, что хотите подтвердить участие?"
            onConfirm={() => onConfirm(app.id)}
            okText="Да, подтвердить"
            cancelText="Отмена"
          >
            <Button type="primary" block loading={confirming}>Подтвердить участие</Button>
          </Popconfirm>
        </>
      )}

      {app.status === 'confirmed' && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <Button
            type="primary" ghost block icon={<SendOutlined />}
            loading={shipping} onClick={onOpenShipModal}
          >
            Отправить товар
          </Button>
        </>
      )}

      {(app.status === 'published' || app.status === 'completed') && app.post_url && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <Button icon={<LinkOutlined />} href={app.post_url} target="_blank" block>
            Смотреть публикацию
          </Button>
        </>
      )}
    </Card>
  );
}

// ── Step 1: Blogger introduction ─────────────────────────────────────────────

function Step1Content({ slot, collection }: { slot: BloggerSlot; collection: Collection }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Blogger card */}
      <Card styles={{ body: { padding: '20px' } }} style={{ borderRadius: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <Avatar src={slot.blogger_avatar} icon={<UserOutlined />} size={56} />
          <div>
            <Link
              href={slot.blogger_profile_url}
              target="_blank"
              style={{ fontSize: 17, fontWeight: 700, color: 'rgba(0,0,0,0.88)', display: 'block', lineHeight: 1.3 }}
            >
              {slot.blogger_name}
              <ArrowRightOutlined style={{ fontSize: 11, marginLeft: 6, color: '#aaa' }} />
            </Link>
            <div style={{ display: 'flex', gap: 18, marginTop: 6, flexWrap: 'wrap' }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <VideoCameraOutlined />{slot.blogger_publications_count} публикаций
              </Text>
              <Text type="secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <EyeOutlined />≈ {formatViews(slot.blogger_avg_views)} просмотров
              </Text>
              <Text style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <StarFilled style={{ color: '#faad14' }} />
                <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>{slot.blogger_rating.toFixed(1)}</Text>
              </Text>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>
            Принимает категории товаров
          </Text>
          <Space size={4} wrap>
            {slot.allowed_categories.map(cat => (
              <Tag key={cat} style={{ margin: 0 }}>{cat}</Tag>
            ))}
          </Space>
        </div>

        <Divider style={{ margin: '0 0 16px' }} />

        <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>Последние публикации</Text>
        <div style={{ display: 'flex', gap: 12 }}>
          {MOCK_POSTS.map(post => (
            <div
              key={post.id}
              style={{
                flex: 1, borderRadius: 8, overflow: 'hidden',
                border: '1px solid #f0f0f0', cursor: 'pointer',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.10)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div style={{ height: 130, background: '#f5f5f5', overflow: 'hidden' }}>
                <img src={post.thumb} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
              <div style={{ padding: '8px 10px' }}>
                <Text style={{ fontSize: 12, lineHeight: 1.4, display: 'block', marginBottom: 4 }}>{post.title}</Text>
                <Text type="secondary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <EyeOutlined style={{ fontSize: 10 }} />{formatViews(post.views)}
                </Text>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* About collection + format */}
      <Card styles={{ body: { padding: '20px' } }} style={{ borderRadius: 8 }}>
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
            { title: 'Одно видео — общий обзор товаров', tooltip: 'Блогер снимает единый ролик, в котором представляет все товары подборки.' },
            { title: 'Финальное видео вы не увидите до публикации', tooltip: 'Мы проверим ролик за вас: оценим качество съёмки, убедимся, что ваш товар представлен корректно.' },
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
    </div>
  );
}

// ── Step 2: Product picker ────────────────────────────────────────────────────

function Step2Content({
  slot, products, selectedIds, onSelect,
}: {
  slot: BloggerSlot;
  products: SellerProduct[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tempSelected, setTempSelected] = useState<string[]>([]);
  const maxSelect = slot.available_slots;
  const selectedProducts = products.filter(p => selectedIds.includes(p.id));

  const handleOpen = () => {
    setTempSelected(selectedIds);
    setPickerOpen(true);
  };

  const toggleProduct = (id: string) => {
    setTempSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= maxSelect) return prev;
      return [...prev, id];
    });
  };

  return (
    <div>
      <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 6 }}>
        Выберите товары, которые хотите разместить у этого блогера.
      </Text>
      <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 24 }}>
        Максимум — <Text strong>{maxSelect}</Text> {maxSelect === 1 ? 'товар' : maxSelect <= 4 ? 'товара' : 'товаров'} (по числу свободных мест).
      </Text>

      <Button
        type="dashed"
        icon={<PlusOutlined />}
        size="large"
        onClick={handleOpen}
        style={{ width: '100%', height: 56, marginBottom: 24 }}
      >
        {selectedIds.length > 0 ? `Изменить выбор (${selectedIds.length} из ${maxSelect})` : 'Добавить товары'}
      </Button>

      {selectedProducts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Выбранные товары:</Text>
          {selectedProducts.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', background: '#f5f2ff',
              borderRadius: 8, border: '1px solid #e4dcff',
            }}>
              <img src={p.image_url} alt={p.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0, background: '#f0f0f0' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 13, display: 'block' }}>{p.name}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>Арт. {p.article} · {p.price.toLocaleString('ru-RU')} ₽</Text>
              </div>
              <Button type="text" size="small" danger onClick={() => onSelect(selectedIds.filter(id => id !== p.id))}>
                Убрать
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Product picker modal */}
      <Modal
        title={
          <div>
            <Text strong>Выбор товаров</Text>
            <Text type="secondary" style={{ fontSize: 13, fontWeight: 'normal', display: 'block', marginTop: 2 }}>
              Выбрано: {tempSelected.length} из {maxSelect}
            </Text>
          </div>
        }
        open={pickerOpen}
        onOk={() => { onSelect(tempSelected); setPickerOpen(false); }}
        onCancel={() => setPickerOpen(false)}
        okText="Готово"
        cancelText="Отмена"
        okButtonProps={{ disabled: tempSelected.length === 0 }}
        width={560}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 480, overflowY: 'auto', paddingRight: 4 }}>
          {products.map(p => {
            const isChecked = tempSelected.includes(p.id);
            const isDisabled = !isChecked && tempSelected.length >= maxSelect;
            return (
              <div
                key={p.id}
                onClick={() => !isDisabled && toggleProduct(p.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 8,
                  border: `1px solid ${isChecked ? '#6B4EFF' : '#f0f0f0'}`,
                  background: isChecked ? '#f5f2ff' : '#fff',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.5 : 1,
                  transition: 'all 0.12s',
                }}
              >
                <Checkbox
                  checked={isChecked}
                  disabled={isDisabled}
                  onClick={e => e.stopPropagation()}
                  onChange={() => toggleProduct(p.id)}
                />
                <img src={p.image_url} alt={p.name} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, flexShrink: 0, background: '#f0f0f0' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 13, display: 'block' }}>{p.name}</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Арт. {p.article} · {p.category} · {p.price.toLocaleString('ru-RU')} ₽
                  </Text>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}

// ── Step 3: Per-product settings ──────────────────────────────────────────────

function Step3Content({
  slot, products, selectedIds, settings, onChange,
}: {
  slot: BloggerSlot;
  products: SellerProduct[];
  selectedIds: string[];
  settings: Record<string, ProductSettings>;
  onChange: (id: string, patch: Partial<ProductSettings>) => void;
}) {
  const selectedProducts = products.filter(p => selectedIds.includes(p.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Text type="secondary" style={{ fontSize: 14 }}>
        Настройте параметры для каждого товара. Можно выбрать до{' '}
        <Text strong>{MAX_KEY_POINTS}</Text> ключевых акцента для блогера на товар.
      </Text>

      {selectedProducts.map(p => {
        const s = settings[p.id] ?? { price: slot.price_per_slot, gift: false, keyPoints: [] };
        return (
          <Card key={p.id} styles={{ body: { padding: '20px' } }} style={{ borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <img src={p.image_url} alt={p.name} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8, flexShrink: 0, background: '#f0f0f0' }} />
              <div>
                <Text strong style={{ fontSize: 15 }}>{p.name}</Text>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Арт. {p.article} · {p.price.toLocaleString('ru-RU')} ₽</Text>
              </div>
            </div>

            <Divider style={{ margin: '0 0 16px' }} />

            <div style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
                Ставка за слот{' '}
                <Text type="secondary" style={{ fontWeight: 400, fontSize: 12 }}>(мин. {slot.price_per_slot.toLocaleString('ru-RU')} ₽)</Text>
              </Text>
              <InputNumber
                value={s.price}
                min={slot.price_per_slot}
                step={500}
                addonAfter="₽"
                style={{ width: 200 }}
                formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''}
                onChange={val => onChange(p.id, { price: val ?? slot.price_per_slot })}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <Checkbox
                checked={s.gift}
                onChange={e => onChange(p.id, { gift: e.target.checked })}
              >
                <Text style={{ fontSize: 13 }}>Отправлю товар блогеру</Text>
              </Checkbox>
            </div>

            <Divider style={{ margin: '0 0 14px' }} />

            <div>
              <Text style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>
                Ключевые акценты для блогера{' '}
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>({s.keyPoints.length}/{MAX_KEY_POINTS})</Text>
              </Text>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
                {KEY_POINTS.map(point => {
                  const isChecked = s.keyPoints.includes(point);
                  const isDisabled = !isChecked && s.keyPoints.length >= MAX_KEY_POINTS;
                  return (
                    <Checkbox
                      key={point}
                      checked={isChecked}
                      disabled={isDisabled}
                      onChange={e => {
                        const next = e.target.checked
                          ? [...s.keyPoints, point]
                          : s.keyPoints.filter(k => k !== point);
                        onChange(p.id, { keyPoints: next });
                      }}
                    >
                      <Text style={{ fontSize: 12 }}>{point}</Text>
                    </Checkbox>
                  );
                })}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ── Existing application detail view ─────────────────────────────────────────

function ExistingAppDetail({
  app, slot, allProducts, productsLoading,
}: {
  app: Application;
  slot: BloggerSlot;
  allProducts: SellerProduct[];
  productsLoading: boolean;
}) {
  const selectedProducts = allProducts.filter(p => app.product_ids.includes(p.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Blogger card (same as step 1) */}
      <Card styles={{ body: { padding: '20px' } }} style={{ borderRadius: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <Avatar src={slot.blogger_avatar || app.blogger_avatar} icon={<UserOutlined />} size={56} />
          <div>
            <Link
              href={slot.blogger_profile_url}
              target="_blank"
              style={{ fontSize: 17, fontWeight: 700, color: 'rgba(0,0,0,0.88)', display: 'block', lineHeight: 1.3 }}
            >
              {slot.blogger_name || app.blogger_name}
              <ArrowRightOutlined style={{ fontSize: 11, marginLeft: 6, color: '#aaa' }} />
            </Link>
            <div style={{ display: 'flex', gap: 18, marginTop: 6, flexWrap: 'wrap' }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <VideoCameraOutlined />{slot.blogger_publications_count} публикаций
              </Text>
              <Text type="secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <EyeOutlined />≈ {formatViews(slot.blogger_avg_views)} просмотров
              </Text>
              <Text style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <StarFilled style={{ color: '#faad14' }} />
                <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>{slot.blogger_rating.toFixed(1)}</Text>
              </Text>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 0 }}>
          <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>
            Принимает категории товаров
          </Text>
          <Space size={4} wrap>
            {slot.allowed_categories.map(cat => (
              <Tag key={cat} style={{ margin: 0 }}>{cat}</Tag>
            ))}
          </Space>
        </div>
      </Card>

      {/* Application detail */}
      <Card
        title={<Text strong style={{ fontSize: 15 }}>Детали заявки</Text>}
        styles={{ body: { padding: '20px' }, header: { padding: '14px 20px' } }}
        style={{ borderRadius: 8 }}
      >
        {/* Offered price */}
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
            Ставка за слот
          </Text>
          <Text strong style={{ fontSize: 22, color: '#6B4EFF' }}>
            {app.offered_price.toLocaleString('ru-RU')}
            <Text type="secondary" style={{ fontSize: 14, fontWeight: 'normal', color: '#6B4EFF' }}> ₽</Text>
          </Text>
        </div>

        {/* Gift summary */}
        {app.gift_product_ids.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <GiftOutlined style={{ color: '#fa8c16' }} />
            <Text style={{ fontSize: 13 }}>
              {app.gift_product_ids.length === 1 ? 'Один товар отправляется' : `${app.gift_product_ids.length} товара отправляются`} блогеру в подарок
            </Text>
          </div>
        )}

        <Divider style={{ margin: '0 0 16px' }} />

        {/* Selected products */}
        <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 12 }}>
          <ShoppingOutlined style={{ marginRight: 6 }} />Выбранные товары ({app.product_ids.length})
        </Text>

        {productsLoading ? (
          <Skeleton active paragraph={{ rows: 2 }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedProducts.map(p => {
              const isGift = app.gift_product_ids.includes(p.id);
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  background: isGift ? '#fff7e6' : '#f9f9ff',
                  borderRadius: 8,
                  border: `1px solid ${isGift ? '#ffd591' : '#ece9ff'}`,
                }}>
                  <img src={p.image_url} alt={p.name} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, flexShrink: 0, background: '#f0f0f0' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 13, display: 'block' }}>{p.name}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>Арт. {p.article} · {p.category} · {p.price.toLocaleString('ru-RU')} ₽</Text>
                  </div>
                  {isGift && (
                    <Tag icon={<GiftOutlined />} color="orange" style={{ margin: 0, fontSize: 11 }}>Подарок блогеру</Tag>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BloggerSlotPage() {
  const { collectionId, slotId } = useParams<{ collectionId: string; slotId: string }>();
  const navigate = useNavigate();
  const setPageView = useCollectionsStore(s => s.setPageView);

  const { data: collection, isLoading, isError } = useCollection(collectionId ?? null);
  const slot = collection?.slots.find(s => s.id === slotId);

  const { data: applications = [] } = useApplications();
  const { mutateAsync: submit, isPending } = useSubmitApplication();
  const { mutate: confirm, isPending: confirming } = useConfirmApplication();
  const { mutate: ship, isPending: shipping } = useShipApplication();

  const [step, setStep] = useState(0);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSettings, setProductSettings] = useState<Record<string, ProductSettings>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paymentSource, setPaymentSource] = useState('main');
  const [shipModalOpen, setShipModalOpen] = useState(false);

  const { data: allProducts = [], isLoading: productsLoading } = useAllSellerProducts();
  // Products allowed for this slot (used in step 2 picker)
  const products = slot
    ? allProducts.filter(p => slot.allowed_categories.includes(p.category))
    : allProducts;

  const existingApp = slot ? applications.find(a => a.slot_id === slot.id) : undefined;
  const isDeadlinePassed = collection ? dayjs().isAfter(dayjs(collection.deadline_at)) : false;
  const noSlots = slot ? slot.available_slots === 0 : false;
  const canApply = !isDeadlinePassed && !noSlots && !existingApp;

  const updateProductSetting = (id: string, patch: Partial<ProductSettings>) => {
    setProductSettings(prev => ({
      ...prev,
      [id]: { ...prev[id] ?? { price: slot!.price_per_slot, gift: false, keyPoints: [] }, ...patch },
    }));
  };

  const proceedToSettings = () => {
    setProductSettings(prev => {
      const next = { ...prev };
      for (const id of selectedProductIds) {
        if (!next[id]) next[id] = { price: slot!.price_per_slot, gift: false, keyPoints: [] };
      }
      return next;
    });
    setStep(2);
  };

  const handleBack = () => {
    if (step === 0) navigate('/collections');
    else setStep(s => s - 1);
  };

  const handleNext = () => {
    if (step === 1) proceedToSettings();
    else setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    const firstId = selectedProductIds[0];
    const firstSettings = productSettings[firstId] ?? { price: slot!.price_per_slot, gift: false };
    const gift_product_ids = selectedProductIds.filter(id => productSettings[id]?.gift);
    await submit({
      collection_id: collection!.id,
      slot_id: slot!.id,
      offered_price: firstSettings.price,
      gift_product: gift_product_ids.length > 0,
      gift_product_ids,
      product_ids: selectedProductIds,
    });
    setConfirmOpen(false);
    setPageView('my');
    navigate('/collections');
  };

  const statusCfg = collection ? collectionStatusConfig[collection.status] : null;
  const showSidebar = !isLoading && !isError && !!slot && (canApply || !!existingApp);

  return (
    <div style={{ padding: '24px 32px', paddingBottom: canApply ? 88 : 48, minHeight: '100vh' }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/collections')}
        style={{ marginBottom: 20, padding: 0, color: '#888' }}
      >
        Назад к подборкам
      </Button>

      {isLoading && <Skeleton active paragraph={{ rows: 16 }} />}
      {isError && <Alert type="error" message="Подборка не найдена" description="Возможно, она была удалена или ссылка неверна." showIcon />}
      {!isLoading && !isError && collection && !slot && <Alert type="error" message="Блогер не найден" description="Слот не существует в этой подборке." showIcon />}

      {!isLoading && collection && slot && (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', maxWidth: 1040, margin: '0 auto' }}>

          {/* ── Main content ── */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Collection header */}
            <div style={{ marginBottom: 24 }}>
              {statusCfg && <Tag color={statusCfg.color} style={{ marginBottom: 6 }}>{statusCfg.label}</Tag>}
              <Title level={3} style={{ margin: '0 0 8px' }}>{collection.title}</Title>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {collection.theme_names.map(name => (
                  <span key={name} style={{ background: '#f0f0f0', color: '#555', fontSize: 12, padding: '2px 10px', borderRadius: 4 }}>
                    {name}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Wizard for new applications ── */}
            {canApply ? (
              <>
                <Steps
                  current={step}
                  style={{ marginBottom: 28 }}
                  items={[{ title: 'О блогере' }, { title: 'Товары' }, { title: 'Настройка' }]}
                />

                {step === 0 && <Step1Content slot={slot} collection={collection} />}

                {step === 1 && (
                  productsLoading
                    ? <Skeleton active paragraph={{ rows: 4 }} />
                    : <Step2Content slot={slot} products={products} selectedIds={selectedProductIds} onSelect={setSelectedProductIds} />
                )}

                {step === 2 && (
                  <Step3Content
                    slot={slot}
                    products={products}
                    selectedIds={selectedProductIds}
                    settings={productSettings}
                    onChange={updateProductSetting}
                  />
                )}
              </>
            ) : existingApp ? (
              /* ── Existing application detail ── */
              <ExistingAppDetail
                app={existingApp}
                slot={slot}
                allProducts={allProducts}
                productsLoading={productsLoading}
              />
            ) : (
              <Alert
                type="warning"
                showIcon
                message={noSlots ? 'Все места заняты — подача заявок закрыта' : 'Дедлайн подачи заявок истёк'}
              />
            )}
          </div>

          {/* ── Right sidebar ── */}
          {showSidebar && (
            <div style={{ width: 260, flexShrink: 0, position: 'sticky', top: 24 }}>
              {canApply ? (
                <WizardSidebar
                  slot={slot}
                  collection={collection}
                  selectedCount={selectedProductIds.length}
                />
              ) : existingApp ? (
                <ExistingAppSidebar
                  app={existingApp}
                  onConfirm={confirm}
                  confirming={confirming}
                  shipping={shipping}
                  onOpenShipModal={() => setShipModalOpen(true)}
                />
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* ── Fixed bottom navigation (wizard only) ── */}
      {!isLoading && !isError && canApply && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#fff', borderTop: '1px solid #f0f0f0',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.07)',
          padding: '14px 32px',
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16,
          zIndex: 200,
        }}>
          <Button size="large" onClick={handleBack}>
            {step === 0 ? 'Отмена' : '← Назад'}
          </Button>
          {step < 2 ? (
            <Button
              type="primary" size="large"
              disabled={step === 1 && selectedProductIds.length === 0}
              onClick={handleNext}
            >
              Далее →
            </Button>
          ) : (
            <Button type="primary" size="large" onClick={() => setConfirmOpen(true)}>
              Отправить заявку
            </Button>
          )}
        </div>
      )}

      {/* ── Confirmation modal ── */}
      <Modal
        open={confirmOpen}
        title="Подтверждение заявки"
        okText="Подать заявку"
        cancelText="Отмена"
        onCancel={() => setConfirmOpen(false)}
        onOk={handleSubmit}
        confirmLoading={isPending}
      >
        <Paragraph style={{ marginBottom: 20 }}>
          Вы уверены, что хотите подать заявку на участие в подборке{' '}
          <Text strong>«{collection?.title}»</Text>?
          После подачи блогер рассмотрит её и примет решение.
        </Paragraph>
        <Text strong style={{ display: 'block', marginBottom: 10 }}>Источник списания средств</Text>
        <Radio.Group value={paymentSource} onChange={e => setPaymentSource(e.target.value)} style={{ width: '100%' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {PAYMENT_SOURCES.map(src => (
              <Radio
                key={src.value}
                value={src.value}
                style={{
                  width: '100%', padding: '10px 14px',
                  border: `1px solid ${paymentSource === src.value ? '#6B4EFF' : '#f0f0f0'}`,
                  borderRadius: 8, background: paymentSource === src.value ? '#f5f2ff' : '#fff',
                  transition: 'all 0.15s',
                }}
              >
                <Text>{src.label}</Text>
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>{src.balance}</Text>
              </Radio>
            ))}
          </Space>
        </Radio.Group>
      </Modal>

      {/* ── Ship modal ── */}
      {existingApp && (
        <ShipModal
          open={shipModalOpen}
          applicationId={existingApp.id}
          products={allProducts.filter(p => existingApp.gift_product_ids.includes(p.id))}
          giftProductIds={existingApp.gift_product_ids}
          onConfirm={() => { ship(existingApp.id, { onSuccess: () => setShipModalOpen(false) }); }}
          onCancel={() => setShipModalOpen(false)}
          loading={shipping}
        />
      )}
    </div>
  );
}
