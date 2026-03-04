import { useState } from 'react';
import { Input, Table, Avatar, Typography, Tag, Skeleton, Empty } from 'antd';
import type { SellerProduct } from '@/types';
import type { TableRowSelection } from 'antd/es/table/interface';

interface ProductsSectionProps {
  products: SellerProduct[];
  isLoading: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function ProductsSection({ products, isLoading, selectedIds, onSelectionChange }: ProductsSectionProps) {
  const [search, setSearch] = useState('');

  const filtered = products.filter(
    p =>
      p.article.includes(search) ||
      p.name.toLowerCase().includes(search.toLowerCase())
  );

  const rowSelection: TableRowSelection<SellerProduct> = {
    type: 'checkbox',
    selectedRowKeys: selectedIds,
    onChange: (keys) => onSelectionChange(keys as string[]),
  };

  const columns = [
    {
      title: 'Товар',
      key: 'product',
      render: (_: unknown, record: SellerProduct) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar src={record.image_url} shape="square" size={40} />
          <div>
            <Typography.Text style={{ display: 'block', fontSize: 13 }}>{record.name}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Арт. {record.article}</Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => <Tag>{cat}</Tag>,
    },
    {
      title: 'Цена',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `${price.toLocaleString('ru-RU')} ₽`,
    },
  ];

  if (isLoading) return <Skeleton active />;

  return (
    <>
      <Input.Search
        placeholder="Поиск по названию или артикулу"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
        allowClear
      />
      <Table<SellerProduct>
        rowSelection={rowSelection}
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 8, size: 'small' }}
        locale={{ emptyText: <Empty description="Нет подходящих товаров" /> }}
        scroll={{ x: true }}
      />
      {selectedIds.length === 0 && (
        <Typography.Text type="danger" style={{ fontSize: 12 }}>
          Выберите хотя бы один товар
        </Typography.Text>
      )}
    </>
  );
}
