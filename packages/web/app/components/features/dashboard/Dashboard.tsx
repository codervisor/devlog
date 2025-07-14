'use client';

import React from 'react';
import { Avatar, Col, Empty, FloatButton, List, Row, Skeleton, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DevlogEntry, DevlogStats, TimeSeriesStats } from '@devlog/types';
import { useRouter } from 'next/navigation';
import {
  getStatusColor,
  getStatusIcon,
} from '@/lib/devlog-ui-utils';
import { DevlogStatusTag, DevlogPriorityTag, DevlogTypeTag } from '@/components';
import { formatTimeAgoWithTooltip } from '@/lib/time-utils';
import styles from './Dashboard.module.css';
import { Gutter } from 'antd/es/grid/row';

const { Title, Text } = Typography;

interface DashboardProps {
  stats: DevlogStats | null;
  timeSeriesData: TimeSeriesStats | null;
  isLoadingTimeSeries: boolean;
  recentDevlogs: DevlogEntry[];
  isLoadingDevlogs: boolean;
  onViewDevlog: (devlog: DevlogEntry) => void;
}

export function Dashboard({
  stats,
  timeSeriesData,
  isLoadingTimeSeries,
  recentDevlogs,
  isLoadingDevlogs,
  onViewDevlog,
}: DashboardProps) {
  const router = useRouter();

  // Format data for charts
  const chartData = React.useMemo(() => {
    if (!timeSeriesData) return [];

    return timeSeriesData.dataPoints.map((point) => ({
      ...point,
      date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: point.date,
    }));
  }, [timeSeriesData]);

  // Format pie chart data for current status distribution
  const pieChartData = React.useMemo(() => {
    if (!stats) return [];

    return [
      { name: 'New', value: stats.byStatus['new'] || 0, color: '#722ed1' },
      { name: 'In Progress', value: stats.byStatus['in-progress'] || 0, color: '#faad14' },
      { name: 'Blocked', value: stats.byStatus['blocked'] || 0, color: '#ff4d4f' },
      { name: 'In Review', value: stats.byStatus['in-review'] || 0, color: '#fa8c16' },
      { name: 'Testing', value: stats.byStatus['testing'] || 0, color: '#13c2c2' },
      { name: 'Done', value: stats.byStatus['done'] || 0, color: '#52c41a' },
      { name: 'Closed', value: stats.byStatus['closed'] || 0, color: '#595959' },
    ].filter((item) => item.value > 0);
  }, [stats]);

  // Define gutter for chart rows
  const chartRowGutter = [48, 24] as [Gutter, Gutter];

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="scrollable-content">
        {/* Charts Section */}
        <div className={styles.dashboardChartsSection}>
          {isLoadingTimeSeries ? (
            <Row gutter={chartRowGutter} className={styles.chartRow}>
              <Col xs={24} lg={12}>
                <div className={styles.chartCard}>
                  <Title level={4} className="mb-4">
                    Development Activity (Last 30 Days)
                  </Title>
                  <Skeleton active paragraph={{ rows: 8 }} />
                </div>
              </Col>
              <Col xs={24} lg={12}>
                <div className={styles.chartCard}>
                  <Title level={4} className="mb-4">
                    Current Status Distribution
                  </Title>
                  <Skeleton active paragraph={{ rows: 8 }} />
                </div>
              </Col>
            </Row>
          ) : chartData.length === 0 ? (
            <Row gutter={chartRowGutter}>
              <Col xs={24}>
                <div className={styles.chartCard}>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No historical data available yet"
                  />
                </div>
              </Col>
            </Row>
          ) : (
            <Row gutter={chartRowGutter}>
              <Col xs={24} lg={12}>
                <div className={styles.chartCard}>
                  <Title level={4} className="mb-4">
                    Development Activity (Last 30 Days)
                  </Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} tickLine={false} />
                      <YAxis fontSize={12} tickLine={false} />
                      <Tooltip
                        labelFormatter={(label, payload) => {
                          const data = payload[0]?.payload;
                          return data ? data.fullDate : label;
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="created"
                        stackId="1"
                        stroke="#1890ff"
                        fill="#1890ff"
                        fillOpacity={0.7}
                        name="Created"
                      />
                      <Area
                        type="monotone"
                        dataKey="completed"
                        stackId="1"
                        stroke="#52c41a"
                        fill="#52c41a"
                        fillOpacity={0.7}
                        name="Completed"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Col>
              <Col xs={24} lg={12}>
                <div className={styles.chartCard}>
                  <Title level={4} className="mb-4">
                    Current Status Distribution
                  </Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value, percent }) =>
                          value > 0 ? `${name}: ${value} (${(percent * 100).toFixed(0)}%)` : ''
                        }
                        labelLine={false}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [value, name]}
                        labelFormatter={() => ''}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value: string) => (
                          <span className={styles.chartLegendText}>{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Col>
            </Row>
          )}
        </div>

        {/* Scrollable Content */}
        <div className={`${styles.recentDevlogs} flex-1 overflow-hidden flex flex-col`}>
          <Title level={3} className={styles.recentDevlogsTitle}>
            Recent Devlogs
          </Title>
          <div className="flex-1 overflow-x-hidden overflow-y-auto thin-scrollbar-vertical">
            {isLoadingDevlogs ? (
              <List
                itemLayout="horizontal"
                dataSource={Array.from({ length: 10 }, (_, index) => ({
                  key: `skeleton-${index}`,
                }))}
                renderItem={() => (
                  <List.Item className={styles.devlogListItem}>
                    <List.Item.Meta
                      className={styles.devlogListItemMeta}
                      avatar={<Skeleton.Avatar size={40} active />}
                      title={<Skeleton paragraph={{ rows: 2 }} active />}
                    />
                  </List.Item>
                )}
              />
            ) : recentDevlogs.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No devlogs found"
                className={styles.emptyDevlogs}
              />
            ) : (
              <List
                itemLayout="horizontal"
                dataSource={recentDevlogs}
                renderItem={(devlog) => (
                  <List.Item
                    className={styles.devlogListItem}
                    onClick={() => onViewDevlog(devlog)}
                    actions={[
                      <Text
                        type="secondary"
                        key="date"
                        className={styles.devlogDate}
                        title={formatTimeAgoWithTooltip(devlog.updatedAt).fullDate}
                      >
                        {formatTimeAgoWithTooltip(devlog.updatedAt).timeAgo}
                      </Text>,
                    ]}
                  >
                    <List.Item.Meta
                      className={styles.devlogListItemMeta}
                      avatar={
                        <Text strong className={styles.devlogId}>
                          {devlog.id}
                        </Text>
                        // <Avatar
                        //   size={40}
                        //   icon={getStatusIcon(devlog.status)}
                        //   style={{
                        //     backgroundColor:
                        //       getStatusColor(devlog.status) === 'success'
                        //         ? '#52c41a'
                        //         : getStatusColor(devlog.status) === 'processing'
                        //           ? '#1890ff'
                        //           : getStatusColor(devlog.status) === 'error'
                        //             ? '#ff4d4f'
                        //             : '#d9d9d9',
                        //   }}
                        // />
                      }
                      title={
                        <div className={styles.devlogTitleSection}>
                          <Text strong className={styles.devlogTitleText}>
                            {devlog.title}
                          </Text>
                          <div className={styles.recentDevlogsMeta}>
                            <DevlogStatusTag
                              status={devlog.status}
                              className={styles.devlogTag}
                            />
                            <DevlogPriorityTag
                              priority={devlog.priority}
                              className={styles.devlogTag}
                            />
                            <DevlogTypeTag
                              type={devlog.type}
                              className={styles.devlogTag}
                            />
                          </div>
                        </div>
                      }
                      description={
                        <Text type="secondary" ellipsis className={styles.devlogDescription}>
                          {devlog.description}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </div>
        </div>
      </div>

      <FloatButton
        icon={<PlusOutlined />}
        tooltip="Create new devlog"
        onClick={() => router.push('/devlogs/create')}
        style={{ right: 24, bottom: 24 }}
      />
    </div>
  );
}
