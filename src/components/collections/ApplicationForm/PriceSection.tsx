import { Form, InputNumber, Typography } from 'antd';
import { RiseOutlined, SafetyOutlined } from '@ant-design/icons';

interface PriceSectionProps {
  minPrice: number;
}

export function PriceSection({ minPrice }: PriceSectionProps) {
  return (
    <>
      <Form.Item
        name="offered_price"
        label="Ваша цена за слот (₽)"
        rules={[
          { required: true, message: 'Укажите цену' },
          {
            validator: (_, value: number) =>
              value >= minPrice
                ? Promise.resolve()
                : Promise.reject(new Error(`Минимальная цена: ${minPrice.toLocaleString('ru-RU')} ₽`)),
          },
        ]}
      >
        <InputNumber
          style={{ width: '100%' }}
          min={minPrice}
          step={100}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
          addonAfter="₽"
          size="large"
        />
      </Form.Item>

      <div
        style={{
          background: '#f0f7ff',
          border: '1px solid #91caff',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 16,
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start',
        }}
      >
        <RiseOutlined style={{ color: '#1677ff', marginTop: 2, flexShrink: 0 }} />
        <Typography.Text style={{ fontSize: 13, color: '#1677ff' }}>
          <strong>Совет:</strong> чем выше цена, тем больше шансов, что блогер выберет именно вашу заявку среди других участников.
        </Typography.Text>
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 20 }}>
        <SafetyOutlined style={{ color: '#52c41a', marginTop: 1, flexShrink: 0, fontSize: 13 }} />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Деньги не списываются сразу — только после того, как блогер одобрит вашу заявку.
        </Typography.Text>
      </div>

    </>
  );
}
