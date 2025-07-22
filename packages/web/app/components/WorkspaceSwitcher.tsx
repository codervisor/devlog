'use client';

import React, { useState, useEffect } from 'react';
import { Select, Space, Typography, Tag, Tooltip, Button } from 'antd';
import {
    SwitcherOutlined,
    FileTextOutlined,
    GithubOutlined,
    DatabaseOutlined,
    CloudOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';

const { Text } = Typography;
const { Option } = Select;

interface WorkspaceMetadata {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    lastAccessedAt: string;
}

interface WorkspaceContext {
    workspaceId: string;
    workspace: WorkspaceMetadata;
    isDefault: boolean;
}

interface WorkspacesResponse {
    workspaces: WorkspaceMetadata[];
    currentWorkspace: WorkspaceContext | null;
}

interface WorkspaceSwitcherProps {
    compact?: boolean;
}

export function WorkspaceSwitcher({ compact = false }: WorkspaceSwitcherProps) {
    const [workspaces, setWorkspaces] = useState<WorkspaceMetadata[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceContext | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        loadWorkspaces();
    }, []);

    const loadWorkspaces = async () => {
        try {
            const response = await fetch('/api/workspaces');
            if (!response.ok) {
                throw new Error('Failed to fetch workspaces');
            }
            const data: WorkspacesResponse = await response.json();
            setWorkspaces(data.workspaces);
            setCurrentWorkspace(data.currentWorkspace);
        } catch (error) {
            console.error('Error loading workspaces:', error);
        } finally {
            setLoading(false);
        }
    };

    const switchWorkspace = async (workspaceId: string) => {
        try {
            const response = await fetch(`/api/workspaces/${workspaceId}/switch`, {
                method: 'PUT',
            });

            if (!response.ok) {
                throw new Error('Failed to switch workspace');
            }

            const data = await response.json();
            setCurrentWorkspace(data.workspace);

            // Refresh the page to reload data from new workspace
            window.location.reload();
        } catch (error) {
            console.error('Error switching workspace:', error);
        }
    };

    const getStorageIcon = (workspaceId: string) => {
        // This would ideally come from API, but for now we'll use a default
        return <CloudOutlined />;
    };

    if (compact) {
        return (
            <div className="workspace-switcher-compact">
                <Space size="small">
                    <Select
                        value={currentWorkspace?.workspace.id || 'fallback'}
                        onChange={switchWorkspace}
                        loading={loading}
                        style={{ minWidth: 120 }}
                        size="small"
                    >
                        {currentWorkspace === null && (
                            <Option value="fallback">
                                <Space size="small">
                                    <CloudOutlined />
                                    <Text>Fallback</Text>
                                </Space>
                            </Option>
                        )}
                        {workspaces.map((workspace) => (
                            <Option key={workspace.id} value={workspace.id}>
                                <Space size="small">
                                    {getStorageIcon(workspace.id)}
                                    <Text>{workspace.name}</Text>
                                </Space>
                            </Option>
                        ))}
                    </Select>
                    <Tooltip title="Manage workspaces">
                        <Button
                            type="text"
                            icon={<SettingOutlined />}
                            size="small"
                            onClick={() => router.push('/workspaces')}
                        />
                    </Tooltip>
                </Space>
            </div>
        );
    }

    return (
        <div className="workspace-switcher">
            <div className="workspace-switcher-header">
                <Space>
                    <SwitcherOutlined />
                    <Text strong>Workspace</Text>
                </Space>
                <Tooltip title="Manage workspaces">
                    <Button
                        type="text"
                        icon={<SettingOutlined />}
                        size="small"
                        onClick={() => router.push('/workspaces')}
                    />
                </Tooltip>
            </div>

            <Select
                value={currentWorkspace?.workspace.id || 'fallback'}
                onChange={switchWorkspace}
                loading={loading}
                style={{ width: '100%', marginTop: 8 }}
                placeholder="Select workspace"
            >
                {currentWorkspace === null && (
                    <Option value="fallback">
                        <div>
                            <Space>
                                <CloudOutlined />
                                <Text>Environment Fallback</Text>
                            </Space>
                            <div>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Using .env configuration
                                </Text>
                            </div>
                        </div>
                    </Option>
                )}
                {workspaces.map((workspace) => (
                    <Option key={workspace.id} value={workspace.id}>
                        <div>
                            <Space>
                                {getStorageIcon(workspace.id)}
                                <Text>{workspace.name}</Text>
                                {currentWorkspace?.workspace.id === workspace.id && (
                                    <Tag color="success">Current</Tag>
                                )}
                            </Space>
                            {workspace.description && (
                                <div>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        {workspace.description}
                                    </Text>
                                </div>
                            )}
                        </div>
                    </Option>
                ))}
            </Select>
        </div>
    );
}
