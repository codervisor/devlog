'use client';

import React from 'react';
import { Avatar, Col, Empty, FloatButton, List, Row, Skeleton, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DevlogEntry, DevlogStats, TimeSeriesStats } from '@devlog/core';
import { useRouter } from 'next/navigation';
import { getStatusColor, getStatusIcon } from '@/lib/devlog-ui-utils';
import { DevlogStatusTag, DevlogPriorityTag, DevlogTypeTag } from '@/components';
import { formatTimeAgoWithTooltip } from '@/lib/time-utils';
import { formatTimeSeriesData, CHART_COLORS, CHART_OPACITY, formatTooltipValue, formatTooltipLabel } from './chart-utils';
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

  // Format data for charts using utility function
  const chartData = React.useMemo(() => formatTimeSeriesData(timeSeriesData), [timeSeriesData]);

  // Format pie chart data for current status distribution using utility colors
  const pieChartData = React.useMemo(() => {
    if (!stats) return [];

    return [
      { name: 'New', value: stats.byStatus['new'] || 0, color: CHART_COLORS.purple },
      { name: 'In Progress', value: stats.byStatus['in-progress'] || 0, color: CHART_COLORS.warning },
      { name: 'Blocked', value: stats.byStatus['blocked'] || 0, color: CHART_COLORS.error },
      { name: 'In Review', value: stats.byStatus['in-review'] || 0, color: '#fa8c16' },
      { name: 'Testing', value: stats.byStatus['testing'] || 0, color: CHART_COLORS.cyan },
      { name: 'Done', value: stats.byStatus['done'] || 0, color: CHART_COLORS.success },
      { name: 'Cancelled', value: stats.byStatus['cancelled'] || 0, color: CHART_COLORS.grey },
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
                    Project Progress & Current Workload
                  </Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} tickLine={false} />
                      
                      {/* Primary Y-axis for cumulative data */}
                      <YAxis 
                        yAxisId="cumulative"
                        fontSize={12} 
                        tickLine={false}
                        label={{ value: 'Total Items', angle: -90, position: 'insideLeft' }}
                      />
                      
                      {/* Secondary Y-axis for current workload */}
                      <YAxis 
                        yAxisId="current"
                        orientation="right"
                        fontSize={12} 
                        tickLine={false}
                        label={{ value: 'Current Open', angle: 90, position: 'insideRight' }}
                      />
                      
                      <Tooltip
                        labelFormatter={formatTooltipLabel}
                        formatter={formatTooltipValue}
                      />
                      <Legend />
                      
                      {/* Cumulative data on primary axis with transparency */}
                      <Area
                        yAxisId="cumulative"
                        type="monotone"
                        dataKey="totalCreated"
                        stackId="1"
                        stroke={CHART_COLORS.primary}
                        fill={CHART_COLORS.primary}
                        fillOpacity={CHART_OPACITY.area}
                        strokeWidth={2}
                        name="Total Created"
                      />
                      <Area
                        yAxisId="cumulative"
                        type="monotone"
                        dataKey="totalClosed"
                        stackId="2"
                        stroke={CHART_COLORS.success}
                        fill={CHART_COLORS.success}
                        fillOpacity={CHART_OPACITY.area}
                        strokeWidth={2}
                        name="Total Closed"
                      />
                      
                      {/* Current workload on secondary axis using bar chart */}
                      <Bar
                        yAxisId="current"
                        dataKey="open"
                        fill={CHART_COLORS.warning}
                        fillOpacity={CHART_OPACITY.bar}
                        name="Open"
                      />
                    </ComposedChart>
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
                      }
                      title={
                        <div className={styles.devlogTitleSection}>
                          <Text strong className={styles.devlogTitleText}>
                            {devlog.title}
                          </Text>
                          <div className={styles.recentDevlogsMeta}>
                            <DevlogStatusTag status={devlog.status} className={styles.devlogTag} />
                            <DevlogPriorityTag
                              priority={devlog.priority}
                              className={styles.devlogTag}
                            />
                            <DevlogTypeTag type={devlog.type} className={styles.devlogTag} />
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
