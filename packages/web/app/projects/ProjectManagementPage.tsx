'use client';

import React, { useState, useEffect } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { useRouter } from 'next/navigation';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  PlusIcon,
  SettingsIcon,
  FolderIcon,
  DatabaseIcon,
  EyeIcon,
  LoaderIcon,
  AlertTriangleIcon,
} from 'lucide-react';
import { toast } from 'sonner';

interface ProjectFormData {
  name: string;
  description?: string;
}

export function ProjectManagementPage() {
  const { projects, currentProject, refreshProjects, loading, error } = useProject();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<ProjectFormData>({ name: '', description: '' });
  const router = useRouter();

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Project name is required');
      return;
    }

    try {
      setCreating(true);

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const newProject = await response.json();
      toast.success(`Project "${newProject.name}" created successfully`);

      setIsModalVisible(false);
      setFormData({ name: '', description: '' });
      await refreshProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleViewProject = (projectId: number) => {
    router.push(`/projects/${projectId}`);
  };

  const getProjectStatusColor = (projectId: number) => {
    if (projectId === 1) return 'blue'; // Default project
    if (currentProject?.projectId === projectId) return 'green';
    return 'default';
  };

  const getProjectStatusText = (projectId: number) => {
    if (projectId === 1) return 'Default'; // Default project
    if (currentProject?.projectId === projectId) return 'Active';
    return 'Available';
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <LoaderIcon className="h-8 w-8 animate-spin mb-4" />
          <div>Loading projects...</div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <Alert variant="destructive" className="m-5 flex items-center gap-2">
          <AlertTriangleIcon size={16} />
          <div>
            <div className="font-semibold">Error Loading Projects</div>
            <AlertDescription>{error}</AlertDescription>
          </div>
        </Alert>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      actions={
        <Button
          size="lg"
          onClick={() => setIsModalVisible(true)}
          className="flex items-center gap-2"
        >
          <PlusIcon size={16} />
          New Project
        </Button>
      }
    >
      <div className="w-full max-w-full">
        <div className="px-6 py-6 border-b bg-background">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
              <FolderIcon size={24} />
              Projects
            </h2>
            <p className="text-muted-foreground text-base">
              Manage your development projects and view their dashboards
            </p>
          </div>
        </div>

        <div className="px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    currentProject?.projectId === project.id
                      ? 'border-primary shadow-primary/20'
                      : ''
                  }`}
                  onClick={() => handleViewProject(project.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderIcon size={20} />
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            getProjectStatusColor(project.id) === 'green' ? 'default' : 'secondary'
                          }
                        >
                          {getProjectStatusText(project.id)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.info('Project settings coming soon');
                          }}
                        >
                          <SettingsIcon size={16} />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pb-3">
                    <CardDescription className="line-clamp-2 mb-4">
                      {project.description || 'No description provided'}
                    </CardDescription>

                    <div className="text-xs text-muted-foreground space-y-1 mb-4">
                      <div>
                        <strong>ID:</strong> {project.id}
                      </div>
                      <div>
                        <strong>Created:</strong> {new Date(project.createdAt).toLocaleDateString()}
                      </div>
                      <div>
                        <strong>Updated:</strong> {new Date(project.updatedAt).toLocaleDateString()}
                      </div>
                    </div>

                    {project.tags && project.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {project.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="pt-0 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewProject(project.id);
                      }}
                    >
                      <EyeIcon size={14} />
                      Dashboard
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewProject(project.id);
                      }}
                    >
                      <DatabaseIcon size={14} />
                      Stats
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {projects.length === 0 && (
              <div className="min-h-[60vh] flex items-center justify-center">
                <Card className="text-center p-16 border-dashed border-2 bg-muted/50 max-w-2xl w-full">
                  <FolderIcon size={80} className="mx-auto mb-8 text-muted-foreground" />
                  <h3 className="text-2xl font-semibold mb-4 text-muted-foreground">
                    No Projects Found
                  </h3>
                  <p className="text-muted-foreground mb-8 text-lg max-w-md mx-auto">
                    Create your first project to get started with organizing your development work.
                  </p>
                  <Button
                    size="lg"
                    onClick={() => setIsModalVisible(true)}
                    className="flex items-center gap-2 px-8 py-3"
                  >
                    <PlusIcon size={18} />
                    Create First Project
                  </Button>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isModalVisible} onOpenChange={setIsModalVisible}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                placeholder="e.g., My Development Project"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe what this project is about..."
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalVisible(false);
                  setFormData({ name: '', description: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Project'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
