'use client';

import React from 'react';
import { Button, Select, Space, Typography } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { PaginationMeta } from '@codervisor/devlog-core';

const { Text } = Typography;
const { Option } = Select;

interface PaginationProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  pageSizeOptions?: number[];
  className?: string;
}

export function Pagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  showSizeChanger = true,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}: PaginationProps) {
  const { page, limit, total, totalPages, hasPreviousPage, hasNextPage } = pagination;

  // Calculate visible page numbers
  const getVisiblePages = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
      range.push(i);
    }

    if (page - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (page + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  if (total === 0) {
    return null;
  }

  return (
    <div className={`flex items-center justify-between gap-4 ${className || ''}`}>
      {/* Results info */}
      <Text type="secondary" className="text-sm">
        Showing {startItem}-{endItem} of {total} results
      </Text>

      <Space size="middle" className="flex items-center">
        {/* Page size selector */}
        {showSizeChanger && (
          <Space size="small">
            <Text type="secondary" className="text-sm">
              Show
            </Text>
            <Select value={limit} onChange={onPageSizeChange} size="small" style={{ width: 70 }}>
              {pageSizeOptions.map((size) => (
                <Option key={size} value={size}>
                  {size}
                </Option>
              ))}
            </Select>
            <Text type="secondary" className="text-sm">
              per page
            </Text>
          </Space>
        )}

        {/* Page navigation */}
        <Space size="small">
          <Button
            icon={<LeftOutlined />}
            disabled={!hasPreviousPage}
            onClick={() => onPageChange(page - 1)}
            size="small"
          >
            Previous
          </Button>

          {/* Page numbers */}
          <Space size={4}>
            {getVisiblePages().map((pageNum, index) =>
              pageNum === '...' ? (
                <span key={`dots-${index}`} className="px-2 text-gray-400">
                  ...
                </span>
              ) : (
                <Button
                  key={pageNum}
                  type={pageNum === page ? 'primary' : 'default'}
                  onClick={() => onPageChange(pageNum as number)}
                  size="small"
                  className="min-w-8"
                >
                  {pageNum}
                </Button>
              ),
            )}
          </Space>

          <Button
            iconPosition="end"
            icon={<RightOutlined />}
            disabled={!hasNextPage}
            onClick={() => onPageChange(page + 1)}
            size="small"
          >
            Next
          </Button>
        </Space>
      </Space>
    </div>
  );
}
