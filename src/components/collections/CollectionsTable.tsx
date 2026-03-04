import { useState } from 'react';
import {
  Button, DatePicker, Empty, Input, InputNumber,
  Select, Skeleton, Space, Tag, Tooltip, Typography,
} from 'antd';
import {
  CalendarOutlined, CheckCircleOutlined, DownOutlined, FilterOutlined,
  RightOutlined, TeamOutlined, UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import type { Application, BloggerSlot, Collection } from '@/types';
import { useCollections, useThemes } from '@/api/collections';
import { useApplications } from '@/api/applications';
import { useCollectionsStore } from '@/store/collectionsStore';
import { collectionStatusConfig } from '@/utils/statusConfig';
import { BloggerInfo } from './BloggerInfo';

const { RangePicker } = DatePicker;

// ── Column flex proportions (shared between header and rows) ──────────────────
// avatar(fixed) | blogger | deadline | categories | price | slots | pubdate
const COL = {
  avatar: 36,          // px, fixed
  blogger: 28,         // flex units
  deadline: 16,
  categories: 20,
  price: 12,
  slots: 9,
  pubdate: 14,
};

function colStyle(flex: number, align: 'left' | 'right' | 'center' = 'left') {
  return { flex, textAlign: align as React.CSSProperties['textAlign'], minWidth: 0 };
}

// ── Table header ──────────────────────────────────────────────────────────────

function SlotTableHeader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 4px 8px', borderBottom: '2px solid #f0f0f0', marginBottom: 2,
    }}>
      <div style={{ width: COL.avatar, flexShrink: 0 }} />
      <Typography.Text type="secondary" style={{ fontSize: 11, ...colStyle(COL.blogger) }}>Блогер</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 11, ...colStyle(COL.deadline) }}>Приём заявок</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 11, ...colStyle(COL.categories) }}>Категории</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 11, ...colStyle(COL.price, 'right') }}>Мин. цена</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 11, ...colStyle(COL.slots, 'right') }}>Места</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 11, ...colStyle(COL.pubdate, 'right') }}>Публикация</Typography.Text>
    </div>
  );
}

// ── Available blogger row ─────────────────────────────────────────────────────

function AvailableSlotRow({
  slot,
  collectionId,
  deadline,
}: {
  slot: BloggerSlot;
  collectionId: string;
  deadline: string;
}) {
  const navigate = useNavigate();
  const daysLeft = dayjs(deadline).diff(dayjs(), 'day');
  const isUrgent = daysLeft <= 3;

  return (
    <div
      onClick={() => navigate(`/collections/${collectionId}/slots/${slot.id}`)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 4px', cursor: 'pointer',
        borderBottom: '1px solid #f5f5f5', borderRadius: 4,
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Blogger avatar — fixed width */}
      <BloggerInfo slot={slot} avatarOnly />

      {/* Blogger name + stats */}
      <div style={colStyle(COL.blogger)}>
        <BloggerInfo slot={slot} nameOnly />
      </div>

      {/* "В заявки до [date]" */}
      <div style={colStyle(COL.deadline)}>
        <Tag
          color={isUrgent ? 'error' : 'processing'}
          style={{ fontSize: 11, margin: 0, whiteSpace: 'nowrap' }}
        >
          Заявки до {dayjs(deadline).format('D MMM')}
        </Tag>
      </div>

      {/* Categories */}
      <div style={{ ...colStyle(COL.categories), display: 'flex', flexWrap: 'wrap', gap: 4 }}>
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
      </div>

      {/* Price */}
      <Typography.Text strong style={{ fontSize: 13, color: '#6B4EFF', ...colStyle(COL.price, 'right') }}>
        {slot.price_per_slot.toLocaleString('ru-RU')} ₽
      </Typography.Text>

      {/* Slots */}
      <Typography.Text
        type={slot.available_slots === 0 ? 'danger' : 'secondary'}
        style={{ fontSize: 12, ...colStyle(COL.slots, 'right') }}
      >
        {slot.available_slots}/{slot.total_slots}
      </Typography.Text>

      {/* Publication date */}
      <Typography.Text type="secondary" style={{ fontSize: 12, ...colStyle(COL.pubdate, 'right') }}>
        {dayjs(slot.publication_date).format('D MMM YYYY')}
      </Typography.Text>
    </div>
  );
}

// ── Collection card ───────────────────────────────────────────────────────────

function CollectionCard({
  collection,
  isExpanded,
  onToggle,
  appBySlot,
}: {
  collection: Collection;
  isExpanded: boolean;
  onToggle: () => void;
  appBySlot: Map<string, Application>;
}) {
  const appliedSlots = collection.slots.filter(s => appBySlot.has(s.id));
  const availableSlots = collection.slots.filter(s => !appBySlot.has(s.id));
  const isParticipating = appliedSlots.length > 0;

  if (availableSlots.length === 0) return null;

  // Stats for card header — based on available slots only
  const totalAvailable = availableSlots.reduce((s, sl) => s + sl.available_slots, 0);
  const totalSlots = availableSlots.reduce((s, sl) => s + sl.total_slots, 0);
  const minPrice = Math.min(...availableSlots.map(s => s.price_per_slot));
  const maxPrice = Math.max(...availableSlots.map(s => s.price_per_slot));
  const priceLabel =
    minPrice === maxPrice
      ? `${minPrice.toLocaleString('ru-RU')} ₽`
      : `от ${minPrice.toLocaleString('ru-RU')} до ${maxPrice.toLocaleString('ru-RU')} ₽`;

  const statusCfg = collectionStatusConfig[collection.status];
  const deadlineDate = dayjs(collection.deadline_at);
  const daysLeft = deadlineDate.diff(dayjs(), 'day');

  return (
    <div style={{
      border: `1px solid ${isExpanded ? '#6B4EFF' : '#e8e8e8'}`,
      borderRadius: 10, background: '#fff', marginBottom: 12,
      transition: 'border-color 0.15s', overflow: 'hidden',
    }}>
      {/* Card header — click to expand */}
      <div
        onClick={onToggle}
        style={{
          padding: '16px 20px', cursor: 'pointer',
          background: isExpanded ? '#faf9ff' : '#fff', transition: 'background 0.15s',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Typography.Text strong style={{ fontSize: 15 }}>{collection.title}</Typography.Text>
            <Tag color={statusCfg.color} style={{ margin: 0 }}>{statusCfg.label}</Tag>
          </div>
          <Space>
            {isParticipating && (
              <Tag
                color="purple"
                icon={<CheckCircleOutlined />}
                style={{ fontSize: 11, margin: 0 }}
              >
                Вы участвуете
              </Tag>
            )}
            {isExpanded
              ? <DownOutlined style={{ fontSize: 12, color: '#6B4EFF' }} />
              : <RightOutlined style={{ fontSize: 12, color: '#aaa' }} />
            }
          </Space>
        </div>

        {/* Themes */}
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

        {/* Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <Space size={4}>
            <CalendarOutlined style={{ color: daysLeft <= 3 ? '#ff4d4f' : '#6B4EFF', fontSize: 13 }} />
            <Typography.Text type={daysLeft <= 0 ? 'danger' : undefined} style={{ fontSize: 13 }}>
              Заявки до {deadlineDate.format('D MMM YYYY')}
              {daysLeft >= 0 && daysLeft <= 7 && (
                <span style={{ marginLeft: 4, color: daysLeft <= 3 ? '#ff4d4f' : '#fa8c16' }}>
                  ({daysLeft === 0 ? 'сегодня' : `ещё ${daysLeft} дн.`})
                </span>
              )}
            </Typography.Text>
          </Space>

          <Space size={4}>
            <TeamOutlined style={{ color: '#8c8c8c', fontSize: 13 }} />
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {availableSlots.length} {availableSlots.length === 1 ? 'блогер' : availableSlots.length <= 4 ? 'блогера' : 'блогеров'} доступно
            </Typography.Text>
          </Space>

          <Space size={4}>
            <UserOutlined style={{ color: '#8c8c8c', fontSize: 13 }} />
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {totalAvailable} свободных мест из {totalSlots}
            </Typography.Text>
          </Space>

          <Typography.Text style={{ fontSize: 13, color: '#6B4EFF', fontWeight: 500 }}>
            {priceLabel}
          </Typography.Text>
        </div>
      </div>

      {/* Expanded blogger list */}
      {isExpanded && (
        <div
          style={{ padding: '8px 20px 12px', borderTop: '1px solid #f0f0f0' }}
          onClick={e => e.stopPropagation()}
        >
          <SlotTableHeader />
          {availableSlots.map(slot => (
            <AvailableSlotRow
              key={slot.id}
              slot={slot}
              collectionId={collection.id}
              deadline={collection.deadline_at}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CollectionsTable() {
  const { filters, setFilters } = useCollectionsStore();
  const { data: collections = [], isLoading } = useCollections(filters);
  const { data: themes = [] } = useThemes();
  const { data: applications = [] } = useApplications();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const appBySlot = new Map<string, Application>(applications.map(a => [a.slot_id, a]));

  const visibleCollections = collections.filter(c => c.slots.some(s => !appBySlot.has(s.id)));

  const hasActiveFilters =
    filters.themes.length > 0 || filters.search !== '' ||
    filters.dateRange !== null || filters.priceRange !== null;

  const resetFilters = () => setFilters({ themes: [], search: '', dateRange: null, priceRange: null });

  return (
    <div>
      <Space wrap style={{ marginBottom: 8 }}>
        <Select
          mode="multiple" placeholder="Тематика" value={filters.themes}
          onChange={val => setFilters({ themes: val })}
          options={themes.map(t => ({ label: t.name, value: t.id }))}
          style={{ minWidth: 200 }} allowClear
        />
        <Input.Search
          placeholder="Поиск по названию" value={filters.search}
          onChange={e => setFilters({ search: e.target.value })}
          onSearch={val => setFilters({ search: val })}
          style={{ width: 220 }} allowClear
        />
      </Space>

      <Space wrap style={{ marginBottom: 16 }}>
        <RangePicker
          value={filters.dateRange ? [dayjs(filters.dateRange[0]), dayjs(filters.dateRange[1])] : null}
          onChange={dates => setFilters({
            dateRange: dates ? [dates[0]!.format('YYYY-MM-DD'), dates[1]!.format('YYYY-MM-DD')] : null,
          })}
          placeholder={['Дата публикации от', 'до']} format="D MMM YYYY"
        />
        <Space.Compact>
          <InputNumber
            placeholder="Цена от" value={filters.priceRange?.[0] ?? undefined} min={0} step={500} style={{ width: 120 }}
            onChange={val => { const max = filters.priceRange?.[1] ?? 999_999; setFilters({ priceRange: val != null ? [val, max] : null }); }}
            formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''} addonAfter="₽"
          />
          <InputNumber
            placeholder="до" value={filters.priceRange?.[1] ?? undefined} min={0} step={500} style={{ width: 120 }}
            onChange={val => { const min = filters.priceRange?.[0] ?? 0; setFilters({ priceRange: val != null ? [min, val] : null }); }}
            formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''} addonAfter="₽"
          />
        </Space.Compact>
        {hasActiveFilters && (
          <Button icon={<FilterOutlined />} onClick={resetFilters}>Сбросить фильтры</Button>
        )}
      </Space>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : visibleCollections.length === 0 ? (
        <Empty description="Подборки не найдены" style={{ marginTop: 40 }} />
      ) : (
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
            Найдено: {visibleCollections.length}
          </Typography.Text>
          {visibleCollections.map(c => (
            <CollectionCard
              key={c.id}
              collection={c}
              isExpanded={expandedId === c.id}
              onToggle={() => setExpandedId(prev => prev === c.id ? null : c.id)}
              appBySlot={appBySlot}
            />
          ))}
        </div>
      )}
    </div>
  );
}
