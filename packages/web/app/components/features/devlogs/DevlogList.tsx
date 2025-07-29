'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  MessageSquare,
  X,
  ChevronDown,
  MoreHorizontal,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  DevlogEntry,
  DevlogFilter,
  DevlogId,
  DevlogPriority,
  DevlogStatus,
  DevlogType,
  PaginationMeta,
} from '@codervisor/devlog-core';
import { DevlogPriorityTag, DevlogStatusTag, DevlogTypeTag, Pagination } from '@/components';
import { formatTimeAgoWithTooltip } from '@/lib/time-utils';
import { priorityOptions, statusOptions, typeOptions } from '@/lib/devlog-options';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
  const [searchText, setSearchText] = useState('');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

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
      operation: 'Updating devlogs...',
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
      operation: 'Deleting devlogs...',
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

  const handleBatchAddNote = async () => {
    if (!selectedRowKeys.length || !onBatchAddNote) return;

    if (!batchNoteForm.content.trim()) {
      toast.warning('Please enter note content');
      return;
    }

    setBatchOperationProgress({
      visible: true,
      current: 0,
      total: selectedRowKeys.length,
      operation: 'Adding notes...',
    });

    try {
      for (let i = 0; i <= selectedRowKeys.length; i++) {
        setBatchOperationProgress((prev) => ({ ...prev, current: i }));
        if (i < selectedRowKeys.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      await onBatchAddNote(selectedRowKeys, batchNoteForm.content, batchNoteForm.category);
      toast.success(`Successfully added notes to ${selectedRowKeys.length} devlog(s)`);
      setSelectedRowKeys([]);
      setBatchOperationModal({ visible: false, type: 'note', title: '' });
      setBatchNoteForm({ content: '', category: 'progress' });
    } catch (error) {
      toast.error(
        `Failed to add notes: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setBatchOperationProgress({ visible: false, current: 0, total: 0, operation: '' });
    }
  };

  // Handle search
  const handleSearch = (value: string) => {
    setSearchText(value);
    if (onFilterChange) {
      onFilterChange({
        ...currentFilters,
        search: value || undefined,
      });
    }
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: string | undefined) => {
    if (onFilterChange) {
      onFilterChange({
        ...currentFilters,
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Devlogs...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border border-border rounded">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="w-8 h-8" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with search and filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Devlogs ({devlogs.length})</CardTitle>
            <div className="flex items-center space-x-2">
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
                value={currentFilters?.status?.[0] || 'all'}
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
                value={currentFilters?.priority?.[0] || 'all'}
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
                value={currentFilters?.type?.[0] || 'all'}
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
        </CardHeader>
      </Card>

      {/* Batch Operations */}
      {selectedRowKeys.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedRowKeys.length} item(s) selected
              </span>
              <div className="flex space-x-2">
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
                  variant="outline"
                  onClick={() =>
                    setBatchOperationModal({
                      visible: true,
                      type: 'note',
                      title: 'Add Note to Selected',
                    })
                  }
                  disabled={!onBatchAddNote}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Add Note
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
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Devlogs Table */}
      <Card>
        <CardContent className="p-0">
          {devlogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No devlogs found</p>
              <Link href="/devlogs/create">
                <Button>Create your first devlog</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      className={cn(
                        isIndeterminate &&
                          'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
                      )}
                    />
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
                {devlogs.map((devlog) => (
                  <TableRow key={devlog.id} className="hover:bg-muted/50">
                    <TableCell>
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
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => onViewDevlog(devlog)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Link href={`/devlogs/${devlog.id}/edit`}>
                          <Button size="sm" variant="ghost">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </Link>
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
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && (
        <Pagination
          pagination={pagination}
          onPageChange={onPageChange || (() => {})}
          onPageSizeChange={onPageSizeChange || (() => {})}
        />
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

      {/* Batch Add Note Modal */}
      <Dialog
        open={batchOperationModal.visible && batchOperationModal.type === 'note'}
        onOpenChange={(open) =>
          !open && setBatchOperationModal({ visible: false, type: 'note', title: '' })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note to Selected Devlogs</DialogTitle>
            <DialogDescription>
              Add a note to {selectedRowKeys.length} selected devlog(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="note-category">Category</Label>
              <Select
                value={batchNoteForm.category}
                onValueChange={(value) =>
                  setBatchNoteForm((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="progress">Progress</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="note-content">Note Content</Label>
              <Textarea
                id="note-content"
                value={batchNoteForm.content}
                onChange={(e) => setBatchNoteForm((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="Enter note content..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBatchOperationModal({ visible: false, type: 'note', title: '' })}
            >
              Cancel
            </Button>
            <Button onClick={handleBatchAddNote}>
              Add Note to {selectedRowKeys.length} Devlog(s)
            </Button>
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
