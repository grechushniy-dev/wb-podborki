import { useState } from 'react';
import { Button, Divider, Input, Modal, QRCode, Tag, Typography } from 'antd';
import { GiftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { SellerProduct } from '@/types';

function getDailyQrValue(applicationId: string) {
  return `WB-INFLUENCER:${applicationId}:${dayjs().format('YYYY-MM-DD')}`;
}

function getNextUpdateText() {
  const tomorrow = dayjs().add(1, 'day').startOf('day');
  const hours = tomorrow.diff(dayjs(), 'hour');
  const minutes = tomorrow.diff(dayjs(), 'minute') % 60;
  return `Обновится через ${hours} ч ${minutes} мин`;
}

export interface ShipModalProps {
  open: boolean;
  applicationId: string | null;
  products?: SellerProduct[];
  giftProductIds?: string[];
  onConfirm: (pvzAddress: string) => void;
  onCancel: () => void;
  loading: boolean;
}

export function ShipModal({ open, applicationId, products, giftProductIds = [], onConfirm, onCancel, loading }: ShipModalProps) {
  const [pvzAddress, setPvzAddress] = useState('');

  const qrValue = applicationId ? getDailyQrValue(applicationId) : '';
  const today = dayjs().format('D MMMM YYYY');
  const yesterday = dayjs().subtract(1, 'day').format('D MMMM YYYY');
  const dayBefore = dayjs().subtract(2, 'day').format('D MMMM YYYY');

  const qrHistory = [
    { date: today, status: 'Активен сейчас', isActive: true },
    { date: yesterday, status: 'Отправлен блогеру', isActive: false },
    { date: dayBefore, status: 'Отправлен блогеру', isActive: false },
  ];

  const handleCancel = () => {
    setPvzAddress('');
    onCancel();
  };

  return (
    <Modal
      open={open}
      title="Подтверждение отправки товара"
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>Отмена</Button>,
        <Button
          key="confirm"
          type="primary"
          loading={loading}
          disabled={!pvzAddress.trim()}
          onClick={() => onConfirm(pvzAddress)}
        >
          Подтвердить отправку
        </Button>,
      ]}
      width={520}
      destroyOnClose
    >
      {products && products.length > 0 && (
        <>
          <Typography.Text strong style={{ display: 'block', marginBottom: 10 }}>
            Товары для отправки
          </Typography.Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {products.map(p => {
              const isGift = giftProductIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 8,
                    background: isGift ? '#fff7e6' : '#f9f9ff',
                    border: `1px solid ${isGift ? '#ffd591' : '#ece9ff'}`,
                  }}
                >
                  <img
                    src={p.image_url}
                    alt={p.name}
                    style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0, background: '#f0f0f0' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Typography.Text style={{ fontSize: 13, display: 'block' }}>{p.name}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>Арт. {p.article} · {p.price.toLocaleString('ru-RU')} ₽</Typography.Text>
                  </div>
                  {isGift && (
                    <Tag icon={<GiftOutlined />} color="orange" style={{ margin: 0, fontSize: 11 }}>Подарок</Tag>
                  )}
                </div>
              );
            })}
          </div>
          <Divider style={{ margin: '0 0 16px' }} />
        </>
      )}

      <div style={{ marginBottom: 20 }}>
        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
          Адрес ПВЗ для отправки
        </Typography.Text>
        <Input.TextArea
          value={pvzAddress}
          onChange={e => setPvzAddress(e.target.value)}
          placeholder="Введите адрес пункта выдачи заказов, куда нужно доставить товар блогеру"
          rows={3}
          maxLength={300}
          showCount
        />
      </div>

      <Divider style={{ margin: '16px 0' }} />

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Typography.Text strong>QR-код для блогера</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{getNextUpdateText()}</Typography.Text>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ flexShrink: 0 }}><QRCode value={qrValue} size={128} /></div>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
              Уникальный QR-код автоматически отправляется блогеру раз в сутки. Блогер предъявляет его при получении посылки для верификации.
            </Typography.Text>
            <Tag color="success">Активен сегодня</Tag>
          </div>
        </div>
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
          История QR-кодов:
        </Typography.Text>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 8px', fontSize: 12, color: '#888', fontWeight: 'normal' }}>Дата</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', fontSize: 12, color: '#888', fontWeight: 'normal' }}>Статус</th>
            </tr>
          </thead>
          <tbody>
            {qrHistory.map(item => (
              <tr key={item.date} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: '6px 8px', fontSize: 12 }}>{item.date}</td>
                <td style={{ padding: '6px 8px' }}>
                  <Tag color={item.isActive ? 'success' : 'default'} style={{ fontSize: 11 }}>
                    {item.status}
                  </Tag>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
