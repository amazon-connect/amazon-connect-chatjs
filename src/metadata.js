import pkg from '../package.json';

/**
 * Metadata information about the ChatJS library
 * Used to publish a client-side metrics (CSM)
 */
export const metadata = {
    version: process.env.npm_package_version || pkg.version,
    name: pkg.name,
    source: 'npm',
    repository: pkg.repository?.url || 'https://github.com/amazon-connect/amazon-connect-chatjs',
    build: {
        timestamp: new Date().toISOString(),
        environment: 'production'
    }
};

// Expose the metadata with frozen object to prevent tampering
export const getMetadata = () => Object.freeze({ ...metadata });
