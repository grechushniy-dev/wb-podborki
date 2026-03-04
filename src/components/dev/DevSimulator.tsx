import { useState } from 'react';
import { Avatar, Badge, Button, Drawer, FloatButton, Space, Tag, Typography } from 'antd';
import { BugOutlined, CheckOutlined, CloseOutlined, PlayCircleOutlined, TrophyOutlined } from '@ant-design/icons';
import { useApplications, useDevChangeStatus } from '@/api/applications';
import { applicationStatusConfig } from '@/utils/statusConfig';
import type { Application } from '@/types';

function ActionButtons({ app }: { app: Application }) {
  const { mutate: changeStatus, isPending } = useDevChangeStatus();

  if (app.status === 'pending') {
    return (
      <Space>
        <Button
          size="small"
          type="primary"
          icon={<CheckOutlined />}
          loading={isPending}
          onClick={() => changeStatus({ id: app.id, status: 'approved' })}
        >
          Одобрить
        </Button>
        <Button
          size="small"
          danger
          icon={<CloseOutlined />}
          loading={isPending}
          onClick={() => changeStatus({ id: app.id, status: 'rejected' })}
        >
          Отклонить
        </Button>
      </Space>
    );
  }

  if (app.status === 'shipped') {
    return (
      <Button
        size="small"
        type="primary"
        icon={<PlayCircleOutlined />}
        loading={isPending}
        onClick={() => changeStatus({ id: app.id, status: 'published' })}
      >
        Блогер опубликовал видео
      </Button>
    );
  }

  if (app.status === 'published') {
    return (
      <Button
        size="small"
        icon={<TrophyOutlined />}
        loading={isPending}
        onClick={() => changeStatus({ id: app.id, status: 'completed' })}
      >
        Размещение завершено
      </Button>
    );
  }

  return (
    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
      Нет доступных действий
    </Typography.Text>
  );
}

export function DevSimulator() {
  const [open, setOpen] = useState(false);
  const { data: applications = [] } = useApplications();
  const pendingCount = applications.filter(a => a.status === 'pending').length;

  return (
    <>
      <Badge count={pendingCount} offset={[-4, 4]}>
        <FloatButton
          icon={<BugOutlined />}
          tooltip="Dev: симулятор блогера"
          onClick={() => setOpen(true)}
          style={{ insetInlineEnd: 24, insetBlockEnd: 80 }}
        />
      </Badge>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={
          <Space>
            <BugOutlined />
            <span>Dev: симулятор действий блогера</span>
          </Space>
        }
        placement="right"
        width={400}
      >
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 12 }}>
          Панель для тестирования смены статусов заявок. Доступна только в dev-режиме.
        </Typography.Text>

        {applications.length === 0 && (
          <Typography.Text type="secondary">Заявок нет</Typography.Text>
        )}

        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          {applications.map(app => {
            const cfg = applicationStatusConfig[app.status];
            return (
              <div
                key={app.id}
                style={{
                  border: '1px solid #f0f0f0',
                  borderRadius: 8,
                  padding: 12,
                  background: '#fafafa',
                }}
              >
                <Space style={{ marginBottom: 8 }}>
                  <Avatar src={app.blogger_avatar} size={24} />
                  <Typography.Text strong style={{ fontSize: 13 }}>
                    {app.collection_title}
                  </Typography.Text>
                </Space>
                <div style={{ marginBottom: 8 }}>
                  <Tag color={cfg.color}>{cfg.label}</Tag>
                  {app.gift_product && <Tag>С подарком</Tag>}
                </div>
                <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
                  Цена: {app.offered_price.toLocaleString('ru-RU')} ₽ · {app.product_ids.length} товар(а)
                </Typography.Text>
                <ActionButtons app={app} />
              </div>
            );
          })}
        </Space>
      </Drawer>
    </>
  );
}
