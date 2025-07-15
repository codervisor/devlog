'use client';

import React from 'react';
import {
  Button,
  Empty,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  Skeleton,
  Dropdown,
  Menu,
} from 'antd';
import { DeleteOutlined, EyeOutlined, FilterOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  DevlogEntry,
  DevlogId,
  DevlogPriority,
  DevlogStatus,
  DevlogType,
  DevlogFilter,
} from '@devlog/core';
import { DevlogStatusTag, DevlogPriorityTag, DevlogTypeTag } from '@/components';
import { formatTimeAgoWithTooltip } from '@/lib/time-utils';
import { OverviewStats } from '@/components';
import { statusOptions, priorityOptions, typeOptions } from '@/lib/devlog-options';
import styles from './DevlogList.module.css';
import Link from 'next/link';

const { Title, Text } = Typography;

interface DevlogListProps {
  devlogs: DevlogEntry[];
  loading: boolean;
  onViewDevlog: (devlog: DevlogEntry) => void;
  onDeleteDevlog: (id: DevlogId) => void;
  currentFilters?: DevlogFilter;
  onFilterChange?: (filters: DevlogFilter) => void;
}

export function DevlogList({
  devlogs,
  loading,
  onViewDevlog,
  onDeleteDevlog,
  currentFilters,
  onFilterChange,
}: DevlogListProps) {
  const createFilterDropdown = (
    filterType: 'status' | 'type' | 'priority',
    options: Array<{ label: string; value: string }>,
  ) => {
    const currentValues = currentFilters?.[filterType] || [];

    const handleMenuClick = (values: string[]) => {
      if (onFilterChange) {
        onFilterChange({
          ...currentFilters,
          [filterType]: values.length > 0 ? values : undefined,
        });
      }
    };

    const menu = (
      <Menu
        multiple
        selectable
        selectedKeys={currentValues}
        onSelect={({ selectedKeys }) => handleMenuClick(selectedKeys as string[])}
        onDeselect={({ selectedKeys }) => handleMenuClick(selectedKeys as string[])}
      >
        {options.map((option) => (
          <Menu.Item key={option.value}>{option.label}</Menu.Item>
        ))}
      </Menu>
    );

    return (
      <Dropdown overlay={menu} trigger={['click']} placement="bottomLeft">
        <FilterOutlined
          style={{
            cursor: 'pointer',
            color: currentValues.length > 0 ? '#1890ff' : '#8c8c8c',
            fontSize: '14px',
          }}
        />
      </Dropdown>
    );
  };

  const columns: ColumnsType<DevlogEntry> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      fixed: 'left',
      width: 80,
      render: (id: number) => (
        <Link href={`/devlogs/${id}`}>
          <Text strong className={styles.devlogId}>
            {id}
          </Text>
        </Link>
      ),
      onHeaderCell: (column) => ({
        style: {
          paddingLeft: '24px',
        },
      }),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: 400,
      render: (title: string, record: DevlogEntry) => (
        <>
          <div className={styles.devlogTitleCell}>
            <Text
              strong
              className={styles.devlogTitle}
              onClick={() => onViewDevlog(record)}
              ellipsis={true}
              title={record.title}
            >
              {title}
            </Text>
          </div>
          <Text
            type="secondary"
            className={styles.devlogDescription}
            ellipsis={true}
            title={record.description}
          >
            {record.description}
          </Text>
        </>
      ),
    },
    {
      title: (
        <Space>
          Status
          {onFilterChange && createFilterDropdown('status', statusOptions)}
        </Space>
      ),
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: DevlogStatus) => <DevlogStatusTag status={status} />,
    },
    {
      title: (
        <Space>
          Priority
          {onFilterChange && createFilterDropdown('priority', priorityOptions)}
        </Space>
      ),
      dataIndex: 'priority',
      key: 'priority',
      width: 120,
      render: (priority: DevlogPriority) => <DevlogPriorityTag priority={priority} />,
    },
    {
      title: (
        <Space>
          Type
          {onFilterChange && createFilterDropdown('type', typeOptions)}
        </Space>
      ),
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: DevlogType) => <DevlogTypeTag type={type} />,
    },
    {
      title: 'Assignee',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 120,
      render: (assignee: string) =>
        assignee ? (
          <Text className={styles.devlogAssignee} ellipsis={{ tooltip: assignee }}>
            {assignee}
          </Text>
        ) : (
          <Text type="secondary" className={styles.devlogAssignee}>
            —
          </Text>
        ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 100,
      render: (createdAt: string) => {
        const { timeAgo, fullDate } = formatTimeAgoWithTooltip(createdAt);
        return (
          <Text type="secondary" className={styles.devlogDateSmall} title={fullDate}>
            {timeAgo}
          </Text>
        );
      },
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 100,
      render: (updatedAt: string) => {
        const { timeAgo, fullDate } = formatTimeAgoWithTooltip(updatedAt);
        return (
          <Text type="secondary" className={styles.devlogDateSmall} title={fullDate}>
            {timeAgo}
          </Text>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 180,
      render: (_, record: DevlogEntry) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onViewDevlog(record)}
          >
            View
          </Button>
          <Popconfirm
            title="Delete Devlog"
            description="Are you sure you want to delete this devlog?"
            onConfirm={() => onDeleteDevlog(record.id!)}
            okText="Yes"
            cancelText="No"
          >
            <Button danger size="small" icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div className={styles.devlogListContainer}>
        <div className={styles.devlogListTable}>
          {/* Table skeleton */}
          <Table
            columns={[
              {
                title: 'ID',
                dataIndex: 'id',
                key: 'id',
                fixed: 'left',
                width: 60,
                render: () => (
                  <Skeleton.Button style={{ width: '40px', height: '20px' }} active size="small" />
                ),
              },
              {
                title: 'Title',
                dataIndex: 'title',
                key: 'title',
                fixed: 'left',
                width: 400,
                render: () => (
                  <Skeleton.Button
                    style={{ width: '360px', height: '20px', marginBottom: '4px' }}
                    active
                    size="small"
                  />
                ),
              },
              {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                width: 120,
                render: () => (
                  <Skeleton.Button style={{ width: '80px', height: '20px' }} active size="small" />
                ),
              },
              {
                title: 'Priority',
                dataIndex: 'priority',
                key: 'priority',
                width: 120,
                render: () => (
                  <Skeleton.Button style={{ width: '80px', height: '20px' }} active size="small" />
                ),
              },
              {
                title: 'Type',
                dataIndex: 'type',
                key: 'type',
                width: 120,
                render: () => (
                  <Skeleton.Button style={{ width: '80px', height: '20px' }} active size="small" />
                ),
              },
              {
                title: 'Assignee',
                dataIndex: 'assignee',
                key: 'assignee',
                width: 120,
                render: () => (
                  <Skeleton.Button style={{ width: '80px', height: '20px' }} active size="small" />
                ),
              },
              {
                title: 'Created',
                dataIndex: 'createdAt',
                key: 'createdAt',
                width: 100,
                render: () => (
                  <Skeleton.Button style={{ width: '80px', height: '20px' }} active size="small" />
                ),
              },
              {
                title: 'Updated',
                dataIndex: 'updatedAt',
                key: 'updatedAt',
                width: 100,
                render: () => (
                  <Skeleton.Button style={{ width: '80px', height: '20px' }} active size="small" />
                ),
              },
              {
                title: 'Actions',
                key: 'actions',
                fixed: 'right',
                width: 180,
                render: () => (
                  <Space size="small">
                    <Skeleton.Button
                      style={{ width: '70px', height: '24px' }}
                      active
                      size="small"
                    />
                    <Skeleton.Button
                      style={{ width: '70px', height: '24px' }}
                      active
                      size="small"
                    />
                  </Space>
                ),
              },
            ]}
            dataSource={Array.from({ length: 10 }, (_, index) => ({ key: index }))}
            rowKey="key"
            scroll={{ x: 1200, y: 'calc(100vh - 300px)' }}
            pagination={false}
            size="middle"
            onHeaderRow={() => ({
              style: {
                backgroundColor: '#fff',
              },
            })}
            onRow={() => ({
              style: {
                height: '72px',
              },
            })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.devlogListContainer}>
      <div className={styles.devlogListTable}>
        {devlogs.length === 0 ? (
          <Empty description="No devlogs found" style={{ padding: '40px' }} />
        ) : (
          <Table
            columns={columns}
            dataSource={devlogs}
            rowKey="id"
            scroll={{ x: 1200, y: 'calc(100vh - 64px - 56px - 48px)' }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} devlogs`,
              responsive: true,
            }}
            size="middle"
            onHeaderRow={() => ({
              style: {
                backgroundColor: '#fff',
              },
            })}
          />
        )}
      </div>
    </div>
  );
}
