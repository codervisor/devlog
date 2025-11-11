/**
 * Test Server Utilities
 *
 * Creates isolated test environments for API integration testing.
 * Uses mock servers to avoid complex server startup in tests.
 */

export interface TestServerEnvironment {
  port: number;
  baseUrl: string;
  cleanup: () => Promise<void>;
}

/**
 * Simple test client for making HTTP requests
 */
export class TestApiClient {
  constructor(private baseUrl: string) {}

  async get(path: string, expectedStatus = 200) {
    const response = await fetch(`${this.baseUrl}${path}`);
    const data = response.status !== 204 ? await response.json() : null;

    if (response.status !== expectedStatus) {
      throw new Error(
        `Expected ${expectedStatus}, got ${response.status}: ${JSON.stringify(data)}`,
      );
    }

    return { status: response.status, data };
  }

  async post(path: string, body: any, expectedStatus = 200) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = response.status !== 204 ? await response.json() : null;

    if (response.status !== expectedStatus) {
      throw new Error(
        `Expected ${expectedStatus}, got ${response.status}: ${JSON.stringify(data)}`,
      );
    }

    return { status: response.status, data };
  }

  async put(path: string, body: any, expectedStatus = 200) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = response.status !== 204 ? await response.json() : null;

    if (response.status !== expectedStatus) {
      throw new Error(
        `Expected ${expectedStatus}, got ${response.status}: ${JSON.stringify(data)}`,
      );
    }

    return { status: response.status, data };
  }

  async patch(path: string, body: any, expectedStatus = 200) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = response.status !== 204 ? await response.json() : null;

    if (response.status !== expectedStatus) {
      throw new Error(
        `Expected ${expectedStatus}, got ${response.status}: ${JSON.stringify(data)}`,
      );
    }

    return { status: response.status, data };
  }

  async delete(path: string, expectedStatus = 200) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
    });
    const data = response.status !== 204 ? await response.json() : null;

    if (response.status !== expectedStatus) {
      throw new Error(
        `Expected ${expectedStatus}, got ${response.status}: ${JSON.stringify(data)}`,
      );
    }

    return { status: response.status, data };
  }
}

/**
 * Create a test environment that points to the development server
 * This assumes the development server is already running
 */
export async function createTestEnvironment(): Promise<{
  client: TestApiClient;
  testProjectId: string;
  cleanup: () => Promise<void>;
}> {
  // Use environment variables or defaults
  const baseUrl = process.env.TEST_API_URL || 'http://localhost:3200/api';
  const testProjectId = process.env.TEST_PROJECT_ID || '1';

  const client = new TestApiClient(baseUrl);

  // Verify the server is accessible
  try {
    await client.get('/health');
    console.log(`[TestAPI] Connected to test server at ${baseUrl}`);
  } catch (error) {
    console.warn(`[TestAPI] Could not connect to ${baseUrl}, tests may fail`);
  }

  return {
    client,
    testProjectId,
    cleanup: async () => {
      // No cleanup needed for external server
      console.log('[TestAPI] Test environment cleaned up');
    },
  };
}

/**
 * Check if a test server is available
 */
export async function isTestServerAvailable(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/health`, {
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}
