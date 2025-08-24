'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Edit, Eye, Search, Trash2, X } from 'lucide-react';
import { DevlogEntry, DevlogFilter, DevlogId, DevlogNoteCategory } from '@codervisor/devlog-core';
import { DevlogPriorityTag, DevlogStatusTag, DevlogTypeTag } from '@/components/custom/devlog-tags';
import { Pagination } from '@/components/common/pagination';
import {
  cn,
  debounce,
  formatTimeAgoWithTooltip,
  priorityOptions,
  statusOptions,
  typeOptions,
} from '@/lib';
import { TableDataContext } from '@/stores/base';

interface DevlogListProps {
  devlogContext: TableDataContext<DevlogEntry[]>;
  onViewDevlog: (devlog: DevlogEntry) => void;
  onDeleteDevlog: (id: DevlogId) => void;
  onBatchUpdate?: (ids: DevlogId[], updates: any) => Promise<void>;
  onBatchDelete?: (ids: DevlogId[]) => Promise<void>;
  onFilterChange?: (filters: DevlogFilter) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export function DevlogList({
  devlogContext,
  onViewDevlog,
  onDeleteDevlog,
  onBatchUpdate,
  onBatchDelete,
  onFilterChange,
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
    category: 'progress' as DevlogNoteCategory,
  });
  const [batchOperationProgress, setBatchOperationProgress] = useState<{
    visible: boolean;
    current: number;
    total: number;
    operation: string;
  }>({ visible: false, current: 0, total: 0, operation: '' });
  const [searchText, setSearchText] = useState('');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const { loading, filters, pagination } = devlogContext;

  const devlogs = devlogContext.data || [];

  // Handle batch operations
  const handleBatchUpdate = async () => {
    if (!selectedRowKeys.length || !onBatchUpdate) return;

    const updates = Object.fromEntries(
      Object.entries(batchUpdateForm).filter(([_, value]) => value !== undefined),
    );

    if (Object.keys(updates).length === 0) {
      toast.warning('Please select at least one field to update');
      return;
    }

    setBatchOperationProgress({
      visible: true,
      current: 0,
      total: selectedRowKeys.length,
      operation: 'Updating devlog...',
    });

    try {
      // Simulate progress updates
      for (let i = 0; i <= selectedRowKeys.length; i++) {
        setBatchOperationProgress((prev) => ({ ...prev, current: i }));
        if (i < selectedRowKeys.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      await onBatchUpdate(selectedRowKeys, updates);
      toast.success(`Successfully updated ${selectedRowKeys.length} devlog(s)`);
      setSelectedRowKeys([]);
      setBatchOperationModal({ visible: false, type: 'update', title: '' });
      setBatchUpdateForm({
        status: undefined,
        priority: undefined,
        type: undefined,
        assignee: undefined,
      });
    } catch (error) {
      toast.error(
        `Failed to update devlogs: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setBatchOperationProgress({ visible: false, current: 0, total: 0, operation: '' });
    }
  };

  const handleBatchDelete = async () => {
    if (!selectedRowKeys.length || !onBatchDelete) return;

    setBatchOperationProgress({
      visible: true,
      current: 0,
      total: selectedRowKeys.length,
      operation: 'Deleting devlog...',
    });

    try {
      for (let i = 0; i <= selectedRowKeys.length; i++) {
        setBatchOperationProgress((prev) => ({ ...prev, current: i }));
        if (i < selectedRowKeys.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      await onBatchDelete(selectedRowKeys);
      toast.success(`Successfully deleted ${selectedRowKeys.length} devlog(s)`);
      setSelectedRowKeys([]);
      setBatchOperationModal({ visible: false, type: 'delete', title: '' });
    } catch (error) {
      toast.error(
        `Failed to delete devlogs: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setBatchOperationProgress({ visible: false, current: 0, total: 0, operation: '' });
    }
  };

  // Handle search
  const handleSearch = debounce((value: string) => {
    setSearchText(value);
    if (onFilterChange) {
      onFilterChange({
        ...filters,
        search: value || undefined,
      });
    }
  });

  // Handle filter changes
  const handleFilterChange = (key: string, value: string | undefined) => {
    if (onFilterChange) {
      onFilterChange({
        ...filters,
        [key]: value ? [value] : undefined,
      });
    }
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRowKeys(devlogs.map((d) => d.id).filter(Boolean) as DevlogId[]);
    } else {
      setSelectedRowKeys([]);
    }
  };

  const handleSelectRow = (id: DevlogId, checked: boolean) => {
    if (checked) {
      setSelectedRowKeys([...selectedRowKeys, id]);
    } else {
      setSelectedRowKeys(selectedRowKeys.filter((key) => key !== id));
    }
  };

  const isAllSelected = devlogs.length > 0 && selectedRowKeys.length === devlogs.length;
  const isIndeterminate = selectedRowKeys.length > 0 && selectedRowKeys.length < devlogs.length;

  return (
    <div className="relative h-full px-6">
      {/* Header with search, filters, and actions - Sticky */}
      <div className="sticky top-0 z-20 bg-background border-b h-16 flex items-center justify-between">
        <div className="font-semibold leading-none tracking-tight">Devlogs</div>
        <div className="flex items-center space-x-2">
          {/* Batch Operations */}
          {selectedRowKeys.length > 0 && (
            <>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {selectedRowKeys.length} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setBatchOperationModal({ visible: true, type: 'update', title: 'Batch Update' })
                }
                disabled={!onBatchUpdate}
              >
                <Edit className="h-3 w-3 mr-1" />
                Update
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDeleteConfirmVisible(true)}
                disabled={!onBatchDelete}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedRowKeys([])}>
                <X className="h-3 w-3" />
              </Button>
              <div className="h-6 w-px bg-border mx-2" />
            </>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search devlogs..."
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8 w-64"
            />
          </div>

          {/* Status Filter */}
          <Select
            value={filters?.status?.[0] || 'all'}
            onValueChange={(value) =>
              handleFilterChange('status', value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select
            value={filters?.priority?.[0] || 'all'}
            onValueChange={(value) =>
              handleFilterChange('priority', value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              {priorityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select
            value={filters?.type?.[0] || 'all'}
            onValueChange={(value) =>
              handleFilterChange('type', value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Devlogs Table */}
      {!loading && devlogs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No devlogs found</p>
        </div>
      ) : (
        <div
          className={cn(
            'h-[calc(100%-4rem)] flex flex-col',
            loading ? 'overflow-y-hidden' : 'overflow-y-auto',
          )}
        >
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background after:absolute after:left-0 after:right-0 after:bottom-0 after:h-px after:bg-border">
              <TableRow>
                <TableHead className="w-12">
                  {loading ? (
                    <Skeleton className="w-4 h-4" />
                  ) : (
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      className={cn(
                        isIndeterminate &&
                          'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
                      )}
                    />
                  )}
                </TableHead>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-32">Priority</TableHead>
                <TableHead className="w-32">Type</TableHead>
                <TableHead className="w-32">Updated</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 20 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell>
                        <Skeleton className="w-4 h-4" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-8" />
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-3 w-16" />
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Skeleton className="h-7 w-7" />
                          <Skeleton className="h-7 w-7" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                : devlogs.map((devlog) => (
                    <TableRow
                      key={devlog.id}
                      className="hover:bg-muted/50 cursor-pointer h-14"
                      onClick={() => onViewDevlog(devlog)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={devlog.id ? selectedRowKeys.includes(devlog.id) : false}
                          onCheckedChange={(checked) =>
                            devlog.id && handleSelectRow(devlog.id, checked as boolean)
                          }
                          disabled={!devlog.id}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{devlog.id}</TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <div className="font-medium truncate">{devlog.title}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {devlog.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DevlogStatusTag status={devlog.status} />
                      </TableCell>
                      <TableCell>
                        <DevlogPriorityTag priority={devlog.priority} />
                      </TableCell>
                      <TableCell>
                        <DevlogTypeTag type={devlog.type} />
                      </TableCell>
                      <TableCell>
                        <span
                          className="text-sm text-muted-foreground"
                          title={formatTimeAgoWithTooltip(devlog.updatedAt).fullDate}
                        >
                          {formatTimeAgoWithTooltip(devlog.updatedAt).timeAgo}
                        </span>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="ghost" onClick={() => onViewDevlog(devlog)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => devlog.id && onDeleteDevlog(devlog.id)}
                            className="text-destructive hover:text-destructive"
                            disabled={!devlog.id}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>

          {/* Gutter */}
          <div className="flex-1" />

          {/* Pagination */}
          {pagination && (
            <Pagination
              className="sticky bottom-0 w-full z-10 h-12 flex-shrink-0 bg-background border-t pr-4"
              pagination={pagination}
              disabled={loading}
              onPageChange={onPageChange || (() => {})}
              onPageSizeChange={onPageSizeChange || (() => {})}
            />
          )}
        </div>
      )}

      {/* Batch Update Modal */}
      <Dialog
        open={batchOperationModal.visible && batchOperationModal.type === 'update'}
        onOpenChange={(open) =>
          !open && setBatchOperationModal({ visible: false, type: 'update', title: '' })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batch Update Devlogs</DialogTitle>
            <DialogDescription>
              Update {selectedRowKeys.length} selected devlog(s). Leave fields empty to keep current
              values.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="batch-status">Status</Label>
              <Select
                value={batchUpdateForm.status || 'keep'}
                onValueChange={(value) =>
                  setBatchUpdateForm((prev) => ({
                    ...prev,
                    status: value === 'keep' ? undefined : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Keep current status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">Keep current status</SelectItem>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="batch-priority">Priority</Label>
              <Select
                value={batchUpdateForm.priority || 'keep'}
                onValueChange={(value) =>
                  setBatchUpdateForm((prev) => ({
                    ...prev,
                    priority: value === 'keep' ? undefined : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Keep current priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">Keep current priority</SelectItem>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="batch-type">Type</Label>
              <Select
                value={batchUpdateForm.type || 'keep'}
                onValueChange={(value) =>
                  setBatchUpdateForm((prev) => ({
                    ...prev,
                    type: value === 'keep' ? undefined : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Keep current type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">Keep current type</SelectItem>
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBatchOperationModal({ visible: false, type: 'update', title: '' })}
            >
              Cancel
            </Button>
            <Button onClick={handleBatchUpdate}>Update {selectedRowKeys.length} Devlog(s)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmVisible} onOpenChange={setDeleteConfirmVisible}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Devlogs</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRowKeys.length} selected devlog(s)? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleBatchDelete();
                setDeleteConfirmVisible(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {selectedRowKeys.length} Devlog(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Progress Modal */}
      <Dialog open={batchOperationProgress.visible} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{batchOperationProgress.operation}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Progress
              value={(batchOperationProgress.current / batchOperationProgress.total) * 100}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground text-center">
              {batchOperationProgress.current} of {batchOperationProgress.total} completed
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
