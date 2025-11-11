'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useProjectStore } from '@/stores';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { LoaderIcon, SaveIcon, TrashIcon, AlertTriangleIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Project } from '@codervisor/devlog-core';
import { useProjectName } from '@/components/provider/project-provider';

interface ProjectFormData {
  name: string;
  description?: string;
}

export function ProjectSettingsPage() {
  const projectName = useProjectName();
  const router = useRouter();
  const {
    currentProjectContext,
    currentProjectName,
    setCurrentProjectName,
    updateProject,
    deleteProject,
    fetchCurrentProject,
  } = useProjectStore();

  const [formData, setFormData] = useState<ProjectFormData>({ name: '', description: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const project = currentProjectContext.data;

  useEffect(() => {
    setCurrentProjectName(projectName);
  }, [projectName]);

  // Initialize form data when project loads
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description || '',
      });
    }
  }, [project]);

  // Check for changes
  useEffect(() => {
    if (project) {
      const nameChanged = formData.name !== project.name;
      const descriptionChanged = formData.description !== (project.description || '');
      setHasChanges(nameChanged || descriptionChanged);
    }
  }, [formData, project]);

  // Fetch project data if not loaded
  useEffect(() => {
    fetchCurrentProject();
  }, [currentProjectName]);

  const handleUpdateProject = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.name.trim()) {
        toast.error('Project name is required');
        return;
      }

      if (!project) {
        toast.error('Project not found');
        return;
      }

      try {
        setIsUpdating(true);

        const updates: Partial<Project> = {
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
        };

        await updateProject(project.name, updates);
        toast.success('Project updated successfully');
        setHasChanges(false);
      } catch (error) {
        console.error('Error updating project:', error);
        toast.error('Failed to update project');
      } finally {
        setIsUpdating(false);
      }
    },
    [formData, project, updateProject],
  );

  const handleDeleteProject = useCallback(async () => {
    if (!project) {
      toast.error('Project not found');
      return;
    }

    try {
      setIsDeleting(true);
      await deleteProject(project.name);
      toast.success(`Project "${project.name}" deleted successfully`);

      // Navigate back to projects list
      router.push('/projects');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  }, [project, deleteProject, router]);

  const handleResetForm = useCallback(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description || '',
      });
      setHasChanges(false);
    }
  }, [project]);

  const handleFormChange = useCallback((field: keyof ProjectFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  if (currentProjectContext.loading || !project) {
    return (
      <div className="w-full max-w-full p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header Skeleton */}
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>

          {/* General Settings Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-24 w-full" />
              </div>
              <div className="flex items-center gap-3 pt-4">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-16" />
              </div>
            </CardContent>
          </Card>

          {/* Project Information Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div>
                  <Skeleton className="h-4 w-16 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Danger Zone Skeleton */}
          <Card className="border-destructive">
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-32" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentProjectContext.error) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertTriangleIcon size={16} />
        <div>
          <div className="font-semibold">Error Loading Project</div>
          <AlertDescription>{currentProjectContext.error}</AlertDescription>
        </div>
      </Alert>
    );
  }

  return (
    <div className="w-full max-w-full p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">Project Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your project information and settings</p>
        </div>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>Update your project name and description</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProject} className="space-y-4">
              <div>
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., My Development Project"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this project is about..."
                  value={formData.description || ''}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  disabled={isUpdating || !hasChanges}
                  className="flex items-center gap-2"
                >
                  {isUpdating ? (
                    <>
                      <LoaderIcon className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <SaveIcon className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetForm}
                  disabled={!hasChanges}
                >
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Project Information */}
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
            <CardDescription>View project metadata and statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-4 md:grid-cols-2">
              <div>
                <Label className="text-sm text-muted-foreground">Project ID</Label>
                <p className="text-sm font-mono">{project.id}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Created</Label>
                <p className="text-sm">{new Date(project.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Last Updated</Label>
                <p className="text-sm">{new Date(project.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible and destructive actions</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="flex items-center gap-2">
                  <TrashIcon className="h-4 w-4" />
                  Delete Project
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the project
                    <strong> "{project.name}"</strong> and all of its devlog entries, notes, and
                    associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteProject}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <>
                        <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete Project'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
