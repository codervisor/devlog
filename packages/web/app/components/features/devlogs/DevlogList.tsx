'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Button,
  Empty,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  Skeleton,
  Dropdown,
  Menu,
  Input,
  Progress,
} from 'antd';
import { 
  DeleteOutlined, 
  EyeOutlined, 
  FilterOutlined,
  EditOutlined,
  MessageOutlined,
  UserOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  DevlogEntry,
  DevlogId,
  DevlogPriority,
  DevlogStatus,
  DevlogType,
  DevlogFilter,
  PaginationMeta,
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
  onBatchUpdate?: (ids: DevlogId[], updates: any) => Promise<void>;
  onBatchDelete?: (ids: DevlogId[]) => Promise<void>;
  onBatchAddNote?: (ids: DevlogId[], content: string, category?: string) => Promise<void>;
  currentFilters?: DevlogFilter;
  onFilterChange?: (filters: DevlogFilter) => void;
  pagination?: PaginationMeta | null;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export function DevlogList({
  devlogs,
  loading,
  onViewDevlog,
  onDeleteDevlog,
  onBatchUpdate,
  onBatchDelete,
  onBatchAddNote,
  currentFilters,
  onFilterChange,
  pagination,
  onPageChange,
  onPageSizeChange,
}: DevlogListProps) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<DevlogId[]>([]);
  const [batchOperationModal, setBatchOperationModal] = useState<{
    visible: boolean;
    type: 'update' | 'delete' | 'note';
    title: string;
  }>({ visible: false, type: 'update', title: '' });
  const [batchUpdateForm, setBatchUpdateForm] = useState({
    status: undefined as string | undefined,
    priority: undefined as string | undefined,
    type: undefined as string | undefined,
    assignee: undefined as string | undefined,
  });
  const [batchNoteForm, setBatchNoteForm] = useState({
    content: '',
    category: 'progress' as string,
  });
  const [batchOperationProgress, setBatchOperationProgress] = useState<{
    visible: boolean;
    current: number;
    total: number;
    operation: string;
  }>({ visible: false, current: 0, total: 0, operation: '' });

  // Row selection configuration
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys as DevlogId[]);
    },
    onSelectAll: (selected: boolean, selectedRows: DevlogEntry[], changeRows: DevlogEntry[]) => {
      if (selected) {
        setSelectedRowKeys(devlogs.map(d => d.id!));
      } else {
        setSelectedRowKeys([]);
      }
    },
  };

  // Batch operation handlers
  const handleBatchUpdate = async () => {
    if (!onBatchUpdate || selectedRowKeys.length === 0) return;

    const updates = Object.fromEntries(
      Object.entries(batchUpdateForm).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(updates).length === 0) {
      message.warning('Please select at least one field to update');
      return;
    }

    try {
      setBatchOperationProgress({
        visible: true,
        current: 0,
        total: selectedRowKeys.length,
        operation: 'Updating devlogs...',
      });

      await onBatchUpdate(selectedRowKeys, updates);
      
      setBatchOperationProgress({ visible: false, current: 0, total: 0, operation: '' });
      setBatchOperationModal({ visible: false, type: 'update', title: '' });
      setSelectedRowKeys([]);
      setBatchUpdateForm({ status: undefined, priority: undefined, type: undefined, assignee: undefined });
      message.success(`Successfully updated ${selectedRowKeys.length} devlog(s)`);
    } catch (error) {
      setBatchOperationProgress({ visible: false, current: 0, total: 0, operation: '' });
      message.error('Failed to update devlogs: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleBatchDelete = async () => {
    if (!onBatchDelete || selectedRowKeys.length === 0) return;

    try {
      setBatchOperationProgress({
        visible: true,
        current: 0,
        total: selectedRowKeys.length,
        operation: 'Deleting devlogs...',
      });

      await onBatchDelete(selectedRowKeys);
      
      setBatchOperationProgress({ visible: false, current: 0, total: 0, operation: '' });
      setBatchOperationModal({ visible: false, type: 'delete', title: '' });
      setSelectedRowKeys([]);
      message.success(`Successfully deleted ${selectedRowKeys.length} devlog(s)`);
    } catch (error) {
      setBatchOperationProgress({ visible: false, current: 0, total: 0, operation: '' });
      message.error('Failed to delete devlogs: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleBatchAddNote = async () => {
    if (!onBatchAddNote || selectedRowKeys.length === 0) return;

    if (!batchNoteForm.content.trim()) {
      message.warning('Please enter note content');
      return;
    }

    try {
      setBatchOperationProgress({
        visible: true,
        current: 0,
        total: selectedRowKeys.length,
        operation: 'Adding notes...',
      });

      await onBatchAddNote(selectedRowKeys, batchNoteForm.content, batchNoteForm.category);
      
      setBatchOperationProgress({ visible: false, current: 0, total: 0, operation: '' });
      setBatchOperationModal({ visible: false, type: 'note', title: '' });
      setSelectedRowKeys([]);
      setBatchNoteForm({ content: '', category: 'progress' });
      message.success(`Successfully added notes to ${selectedRowKeys.length} devlog(s)`);
    } catch (error) {
      setBatchOperationProgress({ visible: false, current: 0, total: 0, operation: '' });
      message.error('Failed to add notes: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };
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

  const createSearchFilterDropdown = () => {
    const currentSearch = currentFilters?.search || '';
    const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
    const [localSearchValue, setLocalSearchValue] = useState(currentSearch);
    const searchInputRef = useRef<any>(null);

    // Update local value when external filters change
    useEffect(() => {
      setLocalSearchValue(currentSearch);
    }, [currentSearch]);

    // Auto focus the search input when dropdown opens
    useEffect(() => {
      if (searchDropdownOpen && searchInputRef.current) {
        // Use setTimeout to ensure the input is rendered
        const timer = setTimeout(() => {
          const input = searchInputRef.current?.input || searchInputRef.current;
          if (input && input.focus) {
            input.focus();
          }
        }, 100);
        return () => clearTimeout(timer);
      }
      // Return undefined when condition is not met
      return undefined;
    }, [searchDropdownOpen]);

    const handleSearchApply = useCallback((value: string) => {
      if (onFilterChange) {
        onFilterChange({
          ...currentFilters,
          search: value.trim() || undefined,
        });
      }
    }, [onFilterChange, currentFilters]);

    const handleSearch = () => {
      handleSearchApply(localSearchValue);
      setSearchDropdownOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };

    const handleClear = () => {
      setLocalSearchValue('');
      if (onFilterChange) {
        onFilterChange({
          ...currentFilters,
          search: undefined,
        });
      }
    };

    const handleCancel = () => {
      setLocalSearchValue(currentSearch); // Reset to current filter value
      setSearchDropdownOpen(false);
    };

    const menu = (
      <div className={styles.searchDropdownMenu}>
        <div className={styles.searchDropdownInputContainer}>
          <Input
            ref={searchInputRef}
            placeholder="Search devlogs..."
            value={localSearchValue}
            onChange={(e) => setLocalSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            allowClear
            onClear={handleClear}
            style={{ width: 250 }}
            autoFocus
            prefix={<SearchOutlined />}
          />
        </div>
        <div className={styles.searchDropdownActions}>
          <Button 
            size="small" 
            onClick={handleCancel}
            icon={<CloseOutlined />}
          >
            Cancel
          </Button>
          <Button 
            size="small" 
            type="primary" 
            onClick={handleSearch}
            icon={<SearchOutlined />}
          >
            Search
          </Button>
        </div>
      </div>
    );

    return (
      <Dropdown 
        overlay={menu} 
        trigger={['click']} 
        placement="bottomLeft"
        open={searchDropdownOpen}
        onOpenChange={setSearchDropdownOpen}
      >
        <FilterOutlined
          style={{
            cursor: 'pointer',
            color: currentSearch ? '#1890ff' : '#8c8c8c',
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
      width: 60,
      render: (id: number) => (
        <Link href={`/devlogs/${id}`}>
          <Text strong className={styles.devlogId}>
            {id}
          </Text>
        </Link>
      ),
    },
    {
      title: (
        <Space>
          Title
          {onFilterChange && createSearchFilterDropdown()}
        </Space>
      ),
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

  // Create skeleton columns that match the actual table structure
  const skeletonColumns = [
    // Checkbox column (only show if batch operations are enabled)
    ...(selectedRowKeys.length > 0 || onBatchUpdate || onBatchDelete || onBatchAddNote ? [{
      title: 'Select all',
      dataIndex: 'checkbox',
      key: 'checkbox',
      fixed: 'left' as const,
      width: 50,
      render: () => (
        <Skeleton.Button style={{ width: '16px', height: '16px' }} active size="small" />
      ),
    }] : []),
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      fixed: 'left' as const,
      width: 60,
      render: () => (
        <Skeleton.Button style={{ width: '40px', height: '20px' }} active size="small" />
      ),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      fixed: 'left' as const,
      width: 400,
      render: () => (
        <div>
          <Skeleton.Button
            style={{ width: '300px', height: '16px', marginBottom: '4px' }}
            active
            size="small"
          />
          <br />
          <Skeleton.Button
            style={{ width: '200px', height: '14px' }}
            active
            size="small"
          />
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: () => (
        <Skeleton.Button style={{ width: '80px', height: '24px' }} active size="small" />
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 120,
      render: () => (
        <Skeleton.Button style={{ width: '80px', height: '24px' }} active size="small" />
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: () => (
        <Skeleton.Button style={{ width: '80px', height: '24px' }} active size="small" />
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
      fixed: 'right' as const,
      width: 180,
      render: () => (
        <Space size="small">
          <Skeleton.Button
            style={{ width: '60px', height: '32px' }}
            active
            size="small"
          />
          <Skeleton.Button
            style={{ width: '60px', height: '32px' }}
            active
            size="small"
          />
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.devlogListContainer}>
      <div className={styles.devlogListTable}>
        <Table
          columns={loading ? skeletonColumns : columns}
          dataSource={loading ? Array.from({ length: pagination?.limit || 20 }, (_, index) => ({ key: index } as any)) : devlogs}
          rowKey={loading ? "key" : "id"}
          rowSelection={loading ? undefined : (selectedRowKeys.length > 0 || onBatchUpdate || onBatchDelete || onBatchAddNote ? rowSelection : undefined)}
          scroll={{ x: 1200, y: 'calc(100vh - 64px - 56px - 48px)' }}
          pagination={false} // We'll handle pagination in footer
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
          locale={{
            emptyText: loading ? null : <Empty description="No devlogs found" style={{ padding: '40px' }} />,
          }}
        />
      </div>

      {/* Table Footer with Pagination and Batch Controls - Always show, even during loading */}
      {(devlogs.length > 0 || loading) && (
        <div className={styles.tableFooter}>
          <div className={styles.tableFooterLeft}>
            {selectedRowKeys.length > 0 && !loading ? (
              <Space size="small">
                <Text strong className={styles.selectionCount}>
                  {selectedRowKeys.length} item(s) selected
                </Text>
                <Button 
                  size="small" 
                  onClick={() => setSelectedRowKeys([])}
                  className={styles.clearSelectionBtn}
                >
                  Clear
                </Button>
              </Space>
            ) : (
              <Text type="secondary" className={styles.totalCount}>
                {loading ? (
                  <Skeleton.Button style={{ width: '150px', height: '20px' }} active size="small" />
                ) : pagination ? (
                  `Showing ${Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}-${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} devlogs`
                ) : (
                  `Total: ${devlogs.length} devlogs`
                )}
              </Text>
            )}
          </div>

          <div className={styles.tableFooterCenter}>
            {selectedRowKeys.length > 0 && !loading && (
              <Space size="small">
                {onBatchUpdate && (
                  <Button 
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => setBatchOperationModal({ 
                      visible: true, 
                      type: 'update', 
                      title: 'Batch Update' 
                    })}
                  >
                    Update
                  </Button>
                )}
                {onBatchAddNote && (
                  <Button 
                    size="small"
                    icon={<MessageOutlined />}
                    onClick={() => setBatchOperationModal({ 
                      visible: true, 
                      type: 'note', 
                      title: 'Add Note to Selected' 
                    })}
                  >
                    Add Note
                  </Button>
                )}
                {onBatchDelete && (
                  <Popconfirm
                    title={`Delete ${selectedRowKeys.length} devlog(s)?`}
                    description="This action cannot be undone."
                    onConfirm={() => setBatchOperationModal({ 
                      visible: true, 
                      type: 'delete', 
                      title: 'Confirm Batch Delete' 
                    })}
                    okText="Yes, Delete"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                  >
                    <Button 
                      danger 
                      size="small"
                      icon={<DeleteOutlined />}
                    >
                      Delete
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            )}
          </div>

          <div className={styles.tableFooterRight}>
            {/* Page size selector and pagination info */}
            <Space size="small">
              <Select
                size="small"
                value={pagination?.limit || 20}
                style={{ width: 70 }}
                onChange={onPageSizeChange}
                disabled={loading}
                options={[
                  { label: '10', value: 10 },
                  { label: '20', value: 20 },
                  { label: '50', value: 50 },
                  { label: '100', value: 100 },
                ]}
              />
              <Text type="secondary" className={styles.paginationText}>per page</Text>
              {/* Page navigation */}
              {pagination && pagination.totalPages > 1 && (
                <>
                  <Button
                    size="small"
                    disabled={!pagination.hasPreviousPage || loading}
                    onClick={() => onPageChange?.(pagination.page - 1)}
                  >
                    Previous
                  </Button>
                  <Text type="secondary" className={styles.paginationText}>
                    {loading ? (
                      <Skeleton.Button style={{ width: '80px', height: '20px' }} active size="small" />
                    ) : (
                      `Page ${pagination.page} of ${pagination.totalPages}`
                    )}
                  </Text>
                  <Button
                    size="small"
                    disabled={!pagination.hasNextPage || loading}
                    onClick={() => onPageChange?.(pagination.page + 1)}
                  >
                    Next
                  </Button>
                </>
              )}
            </Space>
          </div>
        </div>
      )}

      {/* Batch Update Modal */}
      <Modal
        title={batchOperationModal.title}
        open={batchOperationModal.visible && batchOperationModal.type === 'update'}
        onOk={handleBatchUpdate}
        onCancel={() => setBatchOperationModal({ visible: false, type: 'update', title: '' })}
        okText="Update"
        cancelText="Cancel"
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>Status:</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              placeholder="Select status"
              allowClear
              value={batchUpdateForm.status}
              onChange={(value) => setBatchUpdateForm(prev => ({ ...prev, status: value }))}
              options={statusOptions}
            />
          </div>
          <div>
            <Text strong>Priority:</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              placeholder="Select priority"
              allowClear
              value={batchUpdateForm.priority}
              onChange={(value) => setBatchUpdateForm(prev => ({ ...prev, priority: value }))}
              options={priorityOptions}
            />
          </div>
          <div>
            <Text strong>Type:</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              placeholder="Select type"
              allowClear
              value={batchUpdateForm.type}
              onChange={(value) => setBatchUpdateForm(prev => ({ ...prev, type: value }))}
              options={typeOptions}
            />
          </div>
          <div>
            <Text strong>Assignee:</Text>
            <Input
              style={{ marginTop: 8 }}
              placeholder="Enter assignee"
              value={batchUpdateForm.assignee}
              onChange={(e) => setBatchUpdateForm(prev => ({ ...prev, assignee: e.target.value }))}
              prefix={<UserOutlined />}
            />
          </div>
        </Space>
      </Modal>

      {/* Batch Add Note Modal */}
      <Modal
        title={batchOperationModal.title}
        open={batchOperationModal.visible && batchOperationModal.type === 'note'}
        onOk={handleBatchAddNote}
        onCancel={() => setBatchOperationModal({ visible: false, type: 'note', title: '' })}
        okText="Add Note"
        cancelText="Cancel"
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>Category:</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              value={batchNoteForm.category}
              onChange={(value) => setBatchNoteForm(prev => ({ ...prev, category: value }))}
              options={[
                { label: 'Progress', value: 'progress' },
                { label: 'Issue', value: 'issue' },
                { label: 'Solution', value: 'solution' },
                { label: 'Idea', value: 'idea' },
                { label: 'Reminder', value: 'reminder' },
                { label: 'Feedback', value: 'feedback' },
              ]}
            />
          </div>
          <div>
            <Text strong>Note Content:</Text>
            <Input.TextArea
              style={{ marginTop: 8 }}
              placeholder="Enter note content..."
              value={batchNoteForm.content}
              onChange={(e) => setBatchNoteForm(prev => ({ ...prev, content: e.target.value }))}
              rows={4}
            />
          </div>
        </Space>
      </Modal>

      {/* Batch Delete Confirmation Modal */}
      <Modal
        title="Confirm Bulk Delete"
        open={batchOperationModal.visible && batchOperationModal.type === 'delete'}
        onOk={handleBatchDelete}
        onCancel={() => setBatchOperationModal({ visible: false, type: 'delete', title: '' })}
        okText="Delete"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
      >
        <Space direction="vertical">
          <Text>Are you sure you want to delete the following {selectedRowKeys.length} devlog(s)?</Text>
          <Text type="secondary">This action cannot be undone.</Text>
          <div className={styles.batchDeleteList}>
            {devlogs
              .filter(d => selectedRowKeys.includes(d.id!))
              .map(d => (
                <div key={d.id} className={styles.batchDeleteItem}>
                  <Text code>#{d.id}</Text> - {d.title}
                </div>
              ))}
          </div>
        </Space>
      </Modal>

      {/* Progress Modal */}
      <Modal
        title={batchOperationProgress.operation}
        open={batchOperationProgress.visible}
        footer={null}
        closable={false}
        width={400}
      >
        <Progress 
          percent={Math.round((batchOperationProgress.current / batchOperationProgress.total) * 100)}
          status="active"
          format={() => `${batchOperationProgress.current}/${batchOperationProgress.total}`}
        />
      </Modal>
    </div>
  );
}
