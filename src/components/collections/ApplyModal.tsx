import { useState } from 'react';
import { Avatar, Button, Checkbox, Divider, Form, InputNumber, Modal, Space, Spin, Tag, Typography } from 'antd';
import { StarFilled } from '@ant-design/icons';
import type { BloggerSlot } from '@/types';
import { useSellerProducts } from '@/api/seller';
import { useSubmitApplication } from '@/api/applications';

interface ApplyModalProps {
  open: boolean;
  collectionId: string;
  collectionTitle: string;
  slot: BloggerSlot | null;
  onClose: () => void;
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')} млн`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} тыс.`;
  return String(n);
}

export function ApplyModal({ open, collectionId, collectionTitle, slot, onClose }: ApplyModalProps) {
  const [form] = Form.useForm();
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const { mutate: submit, isPending } = useSubmitApplication();

  const { data: products = [], isLoading: loadingProducts } = useSellerProducts(
    slot?.allowed_categories ?? []
  );

  const handleClose = () => {
    form.resetFields();
    setSelectedProductIds([]);
    onClose();
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      if (!slot) return;
      submit(
        {
          collection_id: collectionId,
          slot_id: slot.id,
          offered_price: values.offered_price as number,
          gift_product: values.gift_product as boolean ?? false,
          product_ids: selectedProductIds,
        },
        { onSuccess: handleClose },
      );
    });
  };

  if (!slot) return null;

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title="Подать заявку"
      footer={null}
      width={500}
      destroyOnClose
    >
      {/* Blogger info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Avatar src={slot.blogger_avatar} size={48} />
        <div>
          <Typography.Text strong style={{ display: 'block', fontSize: 15 }}>
            {slot.blogger_name}
          </Typography.Text>
          <Space size={12} style={{ marginTop: 2 }}>
            <Space size={4}>
              <StarFilled style={{ color: '#faad14', fontSize: 12 }} />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{slot.blogger_rating}</Typography.Text>
            </Space>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {formatViews(slot.blogger_avg_views)} просм.
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {slot.blogger_publications_count} публ.
            </Typography.Text>
          </Space>
        </div>
        <Tag color="default" style={{ marginLeft: 'auto' }}>
          {collectionTitle}
        </Tag>
      </div>

      <Divider style={{ margin: '0 0 16px' }} />

      <Form form={form} layout="vertical" requiredMark={false}>
        {/* Price */}
        <Form.Item
          name="offered_price"
          label={
            <span>
              Ваша ставка{' '}
              <Typography.Text type="secondary" style={{ fontWeight: 400, fontSize: 12 }}>
                (мин. {slot.price_per_slot.toLocaleString('ru-RU')} ₽)
              </Typography.Text>
            </span>
          }
          rules={[
            { required: true, message: 'Укажите ставку' },
            { type: 'number', min: slot.price_per_slot, message: `Минимальная ставка — ${slot.price_per_slot.toLocaleString('ru-RU')} ₽` },
          ]}
          initialValue={slot.price_per_slot}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={slot.price_per_slot}
            step={500}
            addonAfter="₽"
            formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''}
          />
        </Form.Item>

        {/* Products */}
        <Form.Item
          label={
            <span>
              Выберите товары{' '}
              <Typography.Text type="secondary" style={{ fontWeight: 400, fontSize: 12 }}>
                (категории: {slot.allowed_categories.join(', ')})
              </Typography.Text>
            </span>
          }
        >
          {loadingProducts ? (
            <Spin size="small" />
          ) : products.length === 0 ? (
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              Нет подходящих товаров по допустимым категориям
            </Typography.Text>
          ) : (
            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 6, padding: '8px 12px' }}>
              {products.map(p => (
                <div key={p.id} style={{ marginBottom: 6 }}>
                  <Checkbox
                    checked={selectedProductIds.includes(p.id)}
                    onChange={e => {
                      setSelectedProductIds(prev =>
                        e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                      );
                    }}
                  >
                    <Space>
                      <Typography.Text style={{ fontSize: 13 }}>{p.name}</Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {p.price.toLocaleString('ru-RU')} ₽
                      </Typography.Text>
                    </Space>
                  </Checkbox>
                </div>
              ))}
            </div>
          )}
        </Form.Item>

        {/* Gift */}
        <Form.Item name="gift_product" valuePropName="checked" style={{ marginBottom: 24 }}>
          <Checkbox>Предложить товар в подарок блогеру</Checkbox>
        </Form.Item>
      </Form>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button onClick={handleClose}>Отмена</Button>
        <Button
          type="primary"
          loading={isPending}
          onClick={handleSubmit}
          disabled={selectedProductIds.length === 0}
        >
          Отправить заявку
        </Button>
      </div>
    </Modal>
  );
}
