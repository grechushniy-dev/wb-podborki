import { Badge, Segmented, Tabs, Typography } from 'antd';
import { useApplications } from '@/api/applications';
import { useCollectionsStore } from '@/store/collectionsStore';
import { CollectionsTable } from './CollectionsTable';
import { MyApplicationsTable } from '@/components/applications/MyApplicationsTable';
import { DevSimulator } from '@/components/dev/DevSimulator';

export function CollectionsPage() {
  const { pageView, setPageView } = useCollectionsStore();
  const { data: applications = [] } = useApplications();
  const approvedCount = applications.filter(a => a.status === 'approved').length;

  return (
    <div style={{ padding: '24px' }}>
      <Typography.Title level={3} style={{ marginBottom: 24 }}>
        Рекламный кабинет WB Инфлюенс
      </Typography.Title>

      <Tabs
        defaultActiveKey="collections"
        items={[
          {
            key: 'cpo',
            label: 'Оплата за заказ (CPO)',
            children: (
              <Typography.Text type="secondary">Раздел CPO — в разработке</Typography.Text>
            ),
          },
          {
            key: 'cpp',
            label: 'Оплата за пост (CPP)',
            children: (
              <Typography.Text type="secondary">Раздел CPP — в разработке</Typography.Text>
            ),
          },
          {
            key: 'collections',
            label: (
              <Badge count={approvedCount} offset={[8, 0]}>
                Подборки
              </Badge>
            ),
            children: (
              <div>
                <Segmented
                  value={pageView}
                  onChange={setPageView}
                  options={[
                    { label: 'Все подборки', value: 'all' },
                    { label: 'Мои заявки', value: 'my' },
                  ]}
                  style={{ marginBottom: 20 }}
                />

                {pageView === 'all' ? <CollectionsTable /> : <MyApplicationsTable />}

                {import.meta.env.DEV && <DevSimulator />}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
