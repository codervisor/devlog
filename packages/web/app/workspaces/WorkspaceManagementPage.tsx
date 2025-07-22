'use client';

import React, { useState, useEffect } from 'react';
import './workspace-management.css';
import {
    Card,
    List,
    Button,
    Typography,
    Space,
    Tag,
    Modal,
    Form,
    Input,
    Select,
    message,
    Popconfirm,
    Badge,
    Tooltip,
    Divider,
} from 'antd';
import {
    PlusOutlined,
    DatabaseOutlined,
    GithubOutlined,
    FileTextOutlined,
    CloudOutlined,
    DeleteOutlined,
    EditOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    SwitcherOutlined,
} from '@ant-design/icons';
import { LoadingPage } from '@/components';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface WorkspaceMetadata {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    lastAccessedAt: string;
    settings?: {
        defaultPriority?: 'low' | 'medium' | 'high' | 'critical';
        theme?: string;
        autoArchiveDays?: number;
    };
}

interface StorageConfig {
    type: 'json' | 'postgres' | 'mysql' | 'sqlite' | 'github';
    connectionString?: string;
    json?: {
        directory: string;
        global: boolean;
    };
    github?: {
        owner: string;
        repo: string;
        token: string;
    };
}

interface WorkspaceContext {
    workspaceId: string;
    workspace: WorkspaceMetadata;
    isDefault: boolean;
}

interface WorkspaceDetail {
    workspace: WorkspaceMetadata;
    storage: StorageConfig;
    connectionStatus: {
        connected: boolean;
        error?: string;
    };
}

interface WorkspacesResponse {
    workspaces: WorkspaceMetadata[];
    currentWorkspace: WorkspaceContext | null;
}

export function WorkspaceManagementPage() {
    const [workspaces, setWorkspaces] = useState<WorkspaceMetadata[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceContext | null>(null);
    const [loading, setLoading] = useState(true);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [connectionStatuses, setConnectionStatuses] = useState<Record<string, { connected: boolean; error?: string }>>({});
    const [form] = Form.useForm();

    // Load workspaces on component mount
    useEffect(() => {
        loadWorkspaces();
    }, []);

    const loadWorkspaces = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/workspaces');
            if (!response.ok) {
                throw new Error('Failed to fetch workspaces');
            }
            const data: WorkspacesResponse = await response.json();
            setWorkspaces(data.workspaces);
            setCurrentWorkspace(data.currentWorkspace);

            // Load connection statuses for all workspaces
            await loadConnectionStatuses(data.workspaces);
        } catch (error) {
            console.error('Error loading workspaces:', error);
            message.error('Failed to load workspaces');
        } finally {
            setLoading(false);
        }
    };

    const loadConnectionStatuses = async (workspaceList: WorkspaceMetadata[]) => {
        const statuses: Record<string, { connected: boolean; error?: string }> = {};

        for (const workspace of workspaceList) {
            try {
                const response = await fetch(`/api/workspaces/${workspace.id}`);
                if (response.ok) {
                    const data: WorkspaceDetail = await response.json();
                    statuses[workspace.id] = data.connectionStatus;
                } else {
                    statuses[workspace.id] = { connected: false, error: 'Failed to check connection' };
                }
            } catch (error) {
                statuses[workspace.id] = { connected: false, error: 'Connection check failed' };
            }
        }

        setConnectionStatuses(statuses);
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
            message.success(`Switched to workspace: ${data.workspace.workspace.name}`);
        } catch (error) {
            console.error('Error switching workspace:', error);
            message.error('Failed to switch workspace');
        }
    };

    const deleteWorkspace = async (workspaceId: string) => {
        try {
            const response = await fetch(`/api/workspaces/${workspaceId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete workspace');
            }

            await loadWorkspaces(); // Reload the list
            message.success('Workspace deleted successfully');
        } catch (error) {
            console.error('Error deleting workspace:', error);
            message.error('Failed to delete workspace');
        }
    };

    const createWorkspace = async (values: any) => {
        try {
            const workspaceData = {
                workspace: {
                    id: values.id,
                    name: values.name,
                    description: values.description,
                    settings: {
                        defaultPriority: values.defaultPriority || 'medium',
                    },
                },
                storage: {
                    type: values.storageType,
                    ...(values.storageType === 'json' && {
                        json: {
                            directory: values.jsonDirectory || '.devlog',
                            global: values.jsonGlobal || false,
                        },
                    }),
                    ...(values.storageType === 'github' && {
                        github: {
                            owner: values.githubOwner,
                            repo: values.githubRepo,
                            token: values.githubToken,
                        },
                    }),
                    ...(values.storageType !== 'json' && values.storageType !== 'github' && {
                        connectionString: values.connectionString,
                    }),
                },
            };

            const response = await fetch('/api/workspaces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(workspaceData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create workspace');
            }

            await loadWorkspaces();
            setCreateModalVisible(false);
            form.resetFields();
            message.success('Workspace created successfully');
        } catch (error) {
            console.error('Error creating workspace:', error);
            message.error(error instanceof Error ? error.message : 'Failed to create workspace');
        }
    };

    const getStorageTypeIcon = (type: string) => {
        switch (type) {
            case 'json': return <FileTextOutlined />;
            case 'github': return <GithubOutlined />;
            case 'postgres': return <DatabaseOutlined />;
            case 'mysql': return <DatabaseOutlined />;
            case 'sqlite': return <DatabaseOutlined />;
            default: return <CloudOutlined />;
        }
    };

    const getStorageTypeColor = (type: string) => {
        switch (type) {
            case 'json': return 'blue';
            case 'github': return 'purple';
            case 'postgres': return 'green';
            case 'mysql': return 'orange';
            case 'sqlite': return 'cyan';
            default: return 'default';
        }
    };

    const renderConnectionStatus = (workspaceId: string) => {
        const status = connectionStatuses[workspaceId];
        if (!status) {
            return <Badge status="processing" text="Checking..." />;
        }

        if (status.connected) {
            return (
                <Tooltip title="Connection healthy">
                    <Badge status="success" text="Connected" />
                </Tooltip>
            );
        } else {
            return (
                <Tooltip title={status.error || 'Connection failed'}>
                    <Badge status="error" text="Disconnected" />
                </Tooltip>
            );
        }
    };

    if (loading) {
        return <LoadingPage />;
    }

    return (
        <div className="workspace-management-page">
            <div className="page-header">
                <Title level={2}>Workspace Management</Title>
                <Paragraph>
                    Manage your devlog workspaces and their storage configurations.
                    Each workspace can have its own storage backend (JSON, GitHub, PostgreSQL, etc.).
                </Paragraph>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateModalVisible(true)}
                >
                    Create Workspace
                </Button>
            </div>

            <div className="current-workspace-section">
                <Title level={4}>Current Workspace</Title>
                {currentWorkspace ? (
                    <Card>
                        <Space align="center">
                            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
                            <Text strong>{currentWorkspace.workspace.name}</Text>
                            {currentWorkspace.isDefault && <Tag color="gold">Default</Tag>}
                            <Text type="secondary">({currentWorkspace.workspace.id})</Text>
                        </Space>
                        {currentWorkspace.workspace.description && (
                            <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                                {currentWorkspace.workspace.description}
                            </Paragraph>
                        )}
                    </Card>
                ) : (
                    <Card>
                        <Text type="secondary">No workspace selected (using fallback configuration)</Text>
                    </Card>
                )}
            </div>

            <Divider />

            <div className="workspaces-list-section">
                <Title level={4}>All Workspaces</Title>
                <List
                    dataSource={workspaces}
                    renderItem={(workspace) => (
                        <List.Item
                            key={workspace.id}
                            actions={[
                                <Button
                                    key="switch"
                                    icon={<SwitcherOutlined />}
                                    onClick={() => switchWorkspace(workspace.id)}
                                    disabled={currentWorkspace?.workspace.id === workspace.id}
                                >
                                    Switch
                                </Button>,
                                <Button
                                    key="edit"
                                    icon={<EditOutlined />}
                                    disabled // TODO: Implement edit functionality
                                >
                                    Edit
                                </Button>,
                                <Popconfirm
                                    key="delete"
                                    title="Are you sure you want to delete this workspace?"
                                    description="This action cannot be undone. All workspace data will be lost."
                                    onConfirm={() => deleteWorkspace(workspace.id)}
                                    okText="Yes"
                                    cancelText="No"
                                    okType="danger"
                                >
                                    <Button
                                        icon={<DeleteOutlined />}
                                        danger
                                        disabled={currentWorkspace?.workspace.id === workspace.id}
                                    >
                                        Delete
                                    </Button>
                                </Popconfirm>,
                            ]}
                        >
                            <List.Item.Meta
                                title={
                                    <Space align="center">
                                        <Text strong>{workspace.name}</Text>
                                        {currentWorkspace?.workspace.id === workspace.id && (
                                            <Tag color="success">Current</Tag>
                                        )}
                                        <Text type="secondary">({workspace.id})</Text>
                                    </Space>
                                }
                                description={
                                    <div>
                                        {workspace.description && (
                                            <Paragraph style={{ marginBottom: 8 }}>
                                                {workspace.description}
                                            </Paragraph>
                                        )}
                                        <Space direction="vertical" size="small">
                                            <div>{renderConnectionStatus(workspace.id)}</div>
                                            <div>
                                                <Text type="secondary">
                                                    Created: {new Date(workspace.createdAt).toLocaleDateString()}
                                                </Text>
                                            </div>
                                            <div>
                                                <Text type="secondary">
                                                    Last accessed: {new Date(workspace.lastAccessedAt).toLocaleDateString()}
                                                </Text>
                                            </div>
                                        </Space>
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            </div>

            <Modal
                title="Create New Workspace"
                open={createModalVisible}
                onCancel={() => {
                    setCreateModalVisible(false);
                    form.resetFields();
                }}
                footer={null}
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={createWorkspace}
                >
                    <Form.Item
                        name="id"
                        label="Workspace ID"
                        rules={[
                            { required: true, message: 'Please enter a workspace ID' },
                            { pattern: /^[a-z0-9-_]+$/, message: 'ID must contain only lowercase letters, numbers, hyphens, and underscores' },
                        ]}
                    >
                        <Input placeholder="e.g., my-project-dev" />
                    </Form.Item>

                    <Form.Item
                        name="name"
                        label="Workspace Name"
                        rules={[{ required: true, message: 'Please enter a workspace name' }]}
                    >
                        <Input placeholder="e.g., My Project Development" />
                    </Form.Item>

                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={2} placeholder="Optional description of this workspace" />
                    </Form.Item>

                    <Form.Item
                        name="defaultPriority"
                        label="Default Priority"
                        initialValue="medium"
                    >
                        <Select>
                            <Option value="low">Low</Option>
                            <Option value="medium">Medium</Option>
                            <Option value="high">High</Option>
                            <Option value="critical">Critical</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="storageType"
                        label="Storage Type"
                        rules={[{ required: true, message: 'Please select a storage type' }]}
                    >
                        <Select placeholder="Select storage backend">
                            <Option value="json">
                                <Space>
                                    <FileTextOutlined />
                                    JSON Files (Local)
                                </Space>
                            </Option>
                            <Option value="github">
                                <Space>
                                    <GithubOutlined />
                                    GitHub Issues
                                </Space>
                            </Option>
                            <Option value="postgres">
                                <Space>
                                    <DatabaseOutlined />
                                    PostgreSQL
                                </Space>
                            </Option>
                            <Option value="mysql">
                                <Space>
                                    <DatabaseOutlined />
                                    MySQL
                                </Space>
                            </Option>
                            <Option value="sqlite">
                                <Space>
                                    <DatabaseOutlined />
                                    SQLite
                                </Space>
                            </Option>
                        </Select>
                    </Form.Item>

                    <Form.Item shouldUpdate={(prevValues, curValues) => prevValues.storageType !== curValues.storageType}>
                        {({ getFieldValue }) => {
                            const storageType = getFieldValue('storageType');

                            if (storageType === 'json') {
                                return (
                                    <>
                                        <Form.Item name="jsonDirectory" label="Directory" initialValue=".devlog">
                                            <Input placeholder=".devlog" />
                                        </Form.Item>
                                        <Form.Item name="jsonGlobal" label="Global Storage" initialValue={false}>
                                            <Select>
                                                <Option value={false}>Project-local storage</Option>
                                                <Option value={true}>Global storage (~/.devlog)</Option>
                                            </Select>
                                        </Form.Item>
                                    </>
                                );
                            }

                            if (storageType === 'github') {
                                return (
                                    <>
                                        <Form.Item
                                            name="githubOwner"
                                            label="GitHub Owner/Organization"
                                            rules={[{ required: true, message: 'Please enter GitHub owner' }]}
                                        >
                                            <Input placeholder="username or organization" />
                                        </Form.Item>
                                        <Form.Item
                                            name="githubRepo"
                                            label="Repository Name"
                                            rules={[{ required: true, message: 'Please enter repository name' }]}
                                        >
                                            <Input placeholder="repository-name" />
                                        </Form.Item>
                                        <Form.Item
                                            name="githubToken"
                                            label="GitHub Token"
                                            rules={[{ required: true, message: 'Please enter GitHub token' }]}
                                        >
                                            <Input.Password placeholder="ghp_..." />
                                        </Form.Item>
                                    </>
                                );
                            }

                            if (storageType && storageType !== 'json' && storageType !== 'github') {
                                return (
                                    <Form.Item
                                        name="connectionString"
                                        label="Connection String"
                                        rules={[{ required: true, message: 'Please enter connection string' }]}
                                    >
                                        <Input.Password placeholder={`${storageType}://username:password@host:port/database`} />
                                    </Form.Item>
                                );
                            }

                            return null;
                        }}
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                Create Workspace
                            </Button>
                            <Button onClick={() => {
                                setCreateModalVisible(false);
                                form.resetFields();
                            }}>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
