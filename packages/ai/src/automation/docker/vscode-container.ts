/**
 * VS Code Container Management
 *
 * Handles Docker container lifecycle for VS Code Insiders with GitHub Copilot
 */

import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { ContainerStatus, AutomationConfig } from '../types/index.js';

export class VSCodeContainer {
  private containerId?: string;
  private process?: ChildProcess;
  private status: ContainerStatus['status'] = 'stopped';
  private config: Required<AutomationConfig>;

  constructor(config: AutomationConfig) {
    this.config = {
      githubToken: config.githubToken,
      vscodeVersion: config.vscodeVersion || 'latest',
      ports: config.ports || { codeServer: 8080, vscode: 3000 },
      timeout: config.timeout || 60000,
      debug: config.debug || false,
    };
  }

  /**
   * Create and start the VS Code container
   */
  async start(): Promise<ContainerStatus> {
    if (this.status === 'running') {
      throw new Error('Container is already running');
    }

    this.status = 'starting';
    const startTime = new Date();

    try {
      // Create Docker configuration files
      await this.createDockerFiles();

      // Build the container
      await this.buildContainer();

      // Start the container
      this.containerId = await this.runContainer();

      // Wait for VS Code to be ready
      await this.waitForReady();

      this.status = 'running';

      return {
        id: this.containerId,
        status: this.status,
        ports: this.config.ports,
        startTime,
      };
    } catch (error) {
      this.status = 'error';
      throw new Error(`Failed to start container: ${error}`);
    }
  }

  /**
   * Stop and remove the container
   */
  async stop(): Promise<void> {
    if (!this.containerId || this.status === 'stopped') {
      return;
    }

    this.status = 'stopping';

    try {
      // Stop the container
      await this.executeCommand(['docker', 'stop', this.containerId]);

      // Remove the container
      await this.executeCommand(['docker', 'rm', this.containerId]);

      this.status = 'stopped';
      this.containerId = undefined;
    } catch (error) {
      this.status = 'error';
      throw new Error(`Failed to stop container: ${error}`);
    }
  }

  /**
   * Get current container status
   */
  getStatus(): ContainerStatus {
    return {
      id: this.containerId || '',
      status: this.status,
      ports: this.config.ports,
    };
  }

  /**
   * Execute a command inside the running container
   */
  async executeInContainer(command: string[]): Promise<string> {
    if (!this.containerId || this.status !== 'running') {
      throw new Error('Container is not running');
    }

    const dockerCommand = ['docker', 'exec', this.containerId, ...command];
    return await this.executeCommand(dockerCommand);
  }

  /**
   * Create necessary Docker configuration files
   */
  private async createDockerFiles(): Promise<void> {
    const tmpDir = '/tmp/vscode-automation';
    await mkdir(tmpDir, { recursive: true });

    // Create Dockerfile
    const dockerfile = this.generateDockerfile();
    await writeFile(join(tmpDir, 'Dockerfile'), dockerfile);

    // Create automation script
    const setupScript = this.generateSetupScript();
    await writeFile(join(tmpDir, 'setup-copilot.sh'), setupScript);

    // Make script executable
    await this.executeCommand(['chmod', '+x', join(tmpDir, 'setup-copilot.sh')]);
  }

  /**
   * Generate Dockerfile content
   */
  private generateDockerfile(): string {
    return `
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \\
    wget \\
    gpg \\
    software-properties-common \\
    git \\
    curl \\
    nodejs \\
    npm \\
    python3 \\
    python3-pip

# Install VS Code Insiders
RUN wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
RUN install -o root -g root -m 644 packages.microsoft.gpg /etc/apt/trusted.gpg.d/
RUN sh -c 'echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/trusted.gpg.d/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list'

RUN apt-get update && apt-get install -y code-insiders

# Install code-server for web access
RUN curl -fsSL https://code-server.dev/install.sh | sh

# Create workspace directory
RUN mkdir -p /workspace

# Copy setup script
COPY setup-copilot.sh /setup-copilot.sh
RUN chmod +x /setup-copilot.sh

EXPOSE 8080 3000

ENTRYPOINT ["/setup-copilot.sh"]
`;
  }

  /**
   * Generate setup script content
   */
  private generateSetupScript(): string {
    return `#!/bin/bash
set -e

# Set environment variables
export GITHUB_TOKEN="${this.config.githubToken}"
export DISPLAY=:99

# Start virtual display if needed
if command -v Xvfb > /dev/null; then
    Xvfb :99 -screen 0 1024x768x24 &
    export XVFB_PID=$!
fi

# Install GitHub Copilot extensions
code-insiders --install-extension GitHub.copilot --force
code-insiders --install-extension GitHub.copilot-chat --force

# Start code-server in background
code-server --bind-addr 0.0.0.0:8080 --auth none /workspace &

# Create test project structure
mkdir -p /workspace/automation-test/{src,tests}

# Generate test files for different languages
cat > /workspace/automation-test/src/algorithms.py << 'EOF'
# Write a binary search function
def binary_search(arr, target):
    # GitHub Copilot should suggest implementation here
    pass

# Write a quicksort function
def quicksort(arr):
    # Copilot should complete this
    pass
EOF

cat > /workspace/automation-test/src/api.js << 'EOF'
// Create an Express.js REST API endpoint
const express = require('express');
const app = express();

// TODO: Add CRUD endpoints for users
// GET /users - get all users
// POST /users - create user
// PUT /users/:id - update user
// DELETE /users/:id - delete user
EOF

cat > /workspace/automation-test/src/utils.ts << 'EOF'
// Utility functions for data processing
interface User {
    id: number;
    name: string;
    email: string;
}

// Write a function to validate email addresses
function validateEmail(email: string): boolean {
    // Copilot should suggest regex validation
}

// Write a function to format user data
function formatUserData(users: User[]): string {
    // Copilot should suggest implementation
}
EOF

# Keep container running
echo "VS Code automation environment ready"
echo "Code-server available at http://localhost:8080"
echo "Test files created in /workspace/automation-test"

# Wait for signals
trap 'kill $XVFB_PID 2>/dev/null; exit 0' SIGTERM SIGINT

# Keep script running
while true; do
    sleep 30
    echo "Container is running..."
done
`;
  }

  /**
   * Build Docker container
   */
  private async buildContainer(): Promise<void> {
    const buildCommand = [
      'docker',
      'build',
      '-t',
      'vscode-copilot-automation:latest',
      '/tmp/vscode-automation',
    ];

    if (this.config.debug) {
      console.log('Building Docker container...');
    }

    await this.executeCommand(buildCommand);
  }

  /**
   * Run Docker container
   */
  private async runContainer(): Promise<string> {
    const runCommand = [
      'docker',
      'run',
      '-d',
      '-p',
      `${this.config.ports.codeServer}:8080`,
      '-p',
      `${this.config.ports.vscode}:3000`,
      '-v',
      '/tmp/vscode-workspace:/workspace',
      '--name',
      `vscode-automation-${Date.now()}`,
      'vscode-copilot-automation:latest',
    ];

    if (this.config.debug) {
      console.log('Starting Docker container...');
    }

    const output = await this.executeCommand(runCommand);
    return output.trim();
  }

  /**
   * Wait for VS Code to be ready
   */
  private async waitForReady(): Promise<void> {
    const startTime = Date.now();
    const timeout = this.config.timeout;

    while (Date.now() - startTime < timeout) {
      try {
        // Check if code-server is responding
        const response = await fetch(`http://localhost:${this.config.ports.codeServer}/healthz`);
        if (response.ok) {
          if (this.config.debug) {
            console.log('VS Code is ready');
          }
          return;
        }
      } catch (error) {
        // Still starting up
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error(`VS Code failed to start within ${timeout}ms`);
  }

  /**
   * Execute shell command and return output
   */
  private executeCommand(command: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(command[0], command.slice(1), {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }
}
