'use client';

import React, { useEffect, useState } from 'react';
import { useProjectStore } from '@/stores';
import { useRouter } from 'next/navigation';
import { PageLayout } from '@/components/layout/PageLayout';
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
  AlertTriangleIcon,
  ChevronRight,
  FolderIcon,
  LoaderIcon,
  PlusIcon,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

interface ProjectFormData {
  name: string;
  description?: string;
}

export function ProjectManagementPage() {
  const { projectsContext, fetchProjects } = useProjectStore();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<ProjectFormData>({ name: '', description: '' });
  const router = useRouter();

  useEffect(() => {
    fetchProjects();
  }, []);

  const { data: projects } = projectsContext;

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
      await fetchProjects();
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

  if (projectsContext.error) {
    return (
      <PageLayout>
        <Alert variant="destructive" className="m-5 flex items-center gap-2">
          <AlertTriangleIcon size={16} />
          <div>
            <div className="font-semibold">Error Loading Projects</div>
            <AlertDescription>{projectsContext.error}</AlertDescription>
          </div>
        </Alert>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="w-full max-w-full">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button className="bg-primary">New Project</Button>
            <div className="relative">
              <Input
                className="pl-10 max-w-[400px] focus:shadow"
                placeholder="Search for a project"
              />
              <Search
                size="14"
                className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            {projects?.map((project) => (
              <Card
                key={project.id}
                className="w-[360px] h-[180px] cursor-pointer transition-all hover:bg-muted/50"
                onClick={() => handleViewProject(project.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <div className="flex items-center gap-2 h-7">
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

          {projects?.length === 0 && (
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
