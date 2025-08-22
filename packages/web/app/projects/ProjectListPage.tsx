'use client';

import React, { useEffect, useState } from 'react';
import { useProjectStore, useRealtimeStore } from '@/stores';
import { useRouter } from 'next/navigation';
import { ProjectGridSkeleton } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  AlertTriangle,
  ChevronRight,
  Folder,
  Loader2,
  Plus,
  Search,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { RealtimeEventType } from '@/lib';
import { projectApiClient } from '@/lib/api';

interface ProjectFormData {
  name: string;
  description?: string;
}

export function ProjectListPage() {
  const { projectsContext, fetchProjects } = useProjectStore();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<ProjectFormData>({ name: '', description: '' });
  const router = useRouter();
  const { subscribe, unsubscribe } = useRealtimeStore();

  useEffect(() => {
    fetchProjects();

    subscribe(RealtimeEventType.PROJECT_CREATED, async () => {
      await fetchProjects();
      toast.success('Project created successfully');
    });
    return () => {
      unsubscribe(RealtimeEventType.PROJECT_CREATED);
    };
  }, [fetchProjects]);

  const { data: projects, loading: isLoadingProjects } = projectsContext;

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Project name is required');
      return;
    }

    try {
      setCreating(true);

      const newProject = await projectApiClient.create(formData);
      toast.success(`Project "${newProject.name}" created successfully`);

      setIsModalVisible(false);
      setFormData({ name: '', description: '' });
      await fetchProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleViewProject = (projectName: string) => {
    router.push(`/projects/${projectName}`);
  };

  const handleProjectSettings = (e: React.MouseEvent, projectName: string) => {
    e.stopPropagation(); // Prevent card click from triggering
    router.push(`/projects/${projectName}/settings`);
  };

  if (projectsContext.error) {
    return (
      <Alert variant="destructive" className="m-5 flex items-center gap-2">
        <AlertTriangle size={16} />
        <div>
          <div className="font-semibold">Error Loading Projects</div>
          <AlertDescription>{projectsContext.error}</AlertDescription>
        </div>
      </Alert>
    );
  }

  return (
    <>
      <div className="w-full max-w-full p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button className="bg-primary" onClick={() => setIsModalVisible(true)}>
              New Project
            </Button>
            <div className="relative">
              <Input
                className="pl-10 w-64 focus-visible:outline-none focus-within:outline-none"
                placeholder="Search for a project"
              />
              <Search
                size="14"
                className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
              />
            </div>
          </div>

          {/* Show skeleton loading state */}
          {isLoadingProjects ? (
            <ProjectGridSkeleton count={2} />
          ) : (
            <>
              {/* Projects grid */}
              <div className="grid gap-6 lg:grid-cols-3 md:grid-cols-2">
                {projects?.map((project) => (
                  <Card
                    key={project.id}
                    className="h-48 cursor-pointer transition-all hover:bg-muted/50"
                    onClick={() => handleViewProject(project.name)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <div className="flex items-center gap-2 h-7">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:bg-muted"
                            onClick={(e) => handleProjectSettings(e, project.name)}
                            title="Project Settings"
                          >
                            <Settings size={14} />
                          </Button>
                          <ChevronRight size={16} />
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pb-3">
                      <CardDescription className="line-clamp-2 mb-4">
                        {project.description || 'No description provided'}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Empty state */}
              {projects?.length === 0 && (
                <div className="min-h-[60vh] flex items-center justify-center">
                  <Card className="text-center p-16 border-dashed border-2 bg-muted/50 max-w-2xl w-full">
                    <Folder size={80} className="mx-auto mb-8 text-muted-foreground" />
                    <h3 className="text-2xl font-semibold mb-4 text-muted-foreground">
                      No Projects Found
                    </h3>
                    <p className="text-muted-foreground mb-8 text-lg max-w-md mx-auto">
                      Create your first project to get started with organizing your development
                      work.
                    </p>
                    <Button
                      size="lg"
                      onClick={() => setIsModalVisible(true)}
                      className="flex items-center gap-2 px-8 py-3"
                    >
                      <Plus size={18} />
                      Create First Project
                    </Button>
                  </Card>
                </div>
              )}
            </>
          )}
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
                placeholder="e.g., My-Dev-Project_2025"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                Can only contain ASCII letters, digits, and the characters -, ., and _
              </p>
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
    </>
  );
}
