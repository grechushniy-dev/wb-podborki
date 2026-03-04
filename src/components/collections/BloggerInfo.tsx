import { Avatar, Typography } from 'antd';
import { EyeOutlined, StarFilled, UserOutlined, VideoCameraOutlined } from '@ant-design/icons';
import type { BloggerSlot } from '@/types';

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')} млн`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} тыс.`;
  return String(n);
}

export function BloggerInfo({
  slot,
  avatarOnly,
  nameOnly,
}: {
  slot: BloggerSlot;
  avatarOnly?: boolean;
  nameOnly?: boolean;
}) {
  if (avatarOnly) {
    return (
      <Avatar
        src={slot.blogger_avatar}
        icon={<UserOutlined />}
        size={36}
        style={{ flexShrink: 0 }}
      />
    );
  }

  if (nameOnly) {
    return (
      <div>
        <Typography.Text strong style={{ fontSize: 13, display: 'block', lineHeight: '1.3' }}>
          {slot.blogger_name}
        </Typography.Text>
        <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
          <Typography.Text type="secondary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 2 }}>
            <StarFilled style={{ color: '#faad14' }} />
            {slot.blogger_rating.toFixed(1)}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 2 }}>
            <EyeOutlined />
            {formatViews(slot.blogger_avg_views)}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 2 }}>
            <VideoCameraOutlined />
            {slot.blogger_publications_count}
          </Typography.Text>
        </div>
      </div>
    );
  }

  return null;
}
