'use client';

import React from 'react';
import { Col, Empty, FloatButton, List, Row, Skeleton, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DevlogEntry, DevlogStats, TimeSeriesStats } from '@devlog/core';
import { useRouter } from 'next/navigation';
import { getColorHex, getStatusColor } from '@/lib/devlog-ui-utils';
import { DevlogPriorityTag, DevlogStatusTag, DevlogTypeTag } from '@/components';
import { formatTimeAgoWithTooltip } from '@/lib/time-utils';
import {
  CHART_COLORS,
  CHART_OPACITY,
  formatTimeSeriesData,
  formatTooltipLabel,
  formatTooltipValue,
} from './chart-utils';
import styles from './Dashboard.module.css';
import { Gutter } from 'antd/es/grid/row';
import { useStickyHeaders } from '@/hooks/useStickyHeaders';

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

  // Format pie chart data for current status distribution using centralized color system
  const pieChartData = React.useMemo(() => {
    if (!stats) return [];

    return [
      { name: 'New', value: stats.byStatus['new'] || 0, color: getColorHex(getStatusColor('new')) },
      {
        name: 'In Progress',
        value: stats.byStatus['in-progress'] || 0,
        color: getColorHex(getStatusColor('in-progress')),
      },
      {
        name: 'Blocked',
        value: stats.byStatus['blocked'] || 0,
        color: getColorHex(getStatusColor('blocked')),
      },
      {
        name: 'In Review',
        value: stats.byStatus['in-review'] || 0,
        color: getColorHex(getStatusColor('in-review')),
      },
      {
        name: 'Testing',
        value: stats.byStatus['testing'] || 0,
        color: getColorHex(getStatusColor('testing')),
      },
      {
        name: 'Done',
        value: stats.byStatus['done'] || 0,
        color: getColorHex(getStatusColor('done')),
      },
      {
        name: 'Cancelled',
        value: stats.byStatus['cancelled'] || 0,
        color: getColorHex(getStatusColor('cancelled')),
      },
    ].filter((item) => item.value > 0);
  }, [stats]);

  // Define gutter for chart rows
  const chartRowGutter = [48, 24] as [Gutter, Gutter];

  // Setup sticky header detection
  useStickyHeaders({
    selectorClass: styles.sectionHeader,
    stickyClass: styles.isSticky,
    topOffset: 0,
    dependencies: [],
  });

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className={`${styles.dashboardContent} scrollable-content`}>
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
              <Col xs={24} lg={12}>
                <div className={styles.chartCard}>
                  <Title level={4} className="mb-4">
                    Project Progress & Current Workload
                  </Title>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No development activity data available yet"
                  />
                </div>
              </Col>
              <Col xs={24} lg={12}>
                <div className={styles.chartCard}>
                  <Title level={4} className="mb-4">
                    Current Status Distribution
                  </Title>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No status distribution data available yet"
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

                      <Tooltip labelFormatter={formatTooltipLabel} formatter={formatTooltipValue} />
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
        <div className={`${styles.recentDevlogs} flex-1 flex flex-col`}>
          <div className={styles.sectionHeader}>
            <Title level={3} className={styles.recentDevlogsTitle}>
              Recent Devlogs
            </Title>
          </div>
          <div className="flex-1 overflow-hidden thin-scrollbar-vertical">
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
