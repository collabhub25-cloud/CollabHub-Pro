/**
 * Storage Abstraction Layer
 * 
 * Defines interface for document/image uploads.
 * Currently uses a mock fallback until AWS keys are provided.
 * Do not save files locally or expose public URLs.
 */

interface StorageConfig {
    useMock: boolean;
    region?: string;
    bucket?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
}

const config: StorageConfig = {
    // Toggle this flag when real keys are injected
    useMock: !process.env.AWS_ACCESS_KEY_ID || process.env.NODE_ENV !== 'production',
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.AWS_S3_BUCKET || 'collabhub-secure-docs',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

export async function uploadDocument(
    fileBuffer: Buffer,
    destinationPath: string,
    contentType: string
): Promise<string> {
    if (config.useMock) {
        console.warn(`[STORAGE MAP] Mock upload: Document saved to virtual path: s3://${config.bucket}/${destinationPath}`);
        return `mock-s3-url://${destinationPath}`;
    }

    // TODO: Implement actual S3 `PutObjectCommand`
    throw new Error('Real S3 upload not implemented. Provide AWS keys and disable mock mode.');
}

export async function generatePresignedUploadUrl(
    destinationPath: string,
    contentType: string,
    expiresInMinutes = 15
): Promise<string> {
    if (config.useMock) {
        console.warn(`[STORAGE MAP] Mock presigned upload request for: ${destinationPath}`);
        return `mock-presigned-upload-url://${destinationPath}?expires=${expiresInMinutes}m`;
    }

    // TODO: Implement actual S3 `getSignedUrl` with `PutObjectCommand`
    throw new Error('Real S3 presigned URLs not implemented.');
}

export async function generateSecureDownloadUrl(
    filePath: string,
    expiresInMinutes = 60
): Promise<string> {
    // Strip mock prefixes if present in DB
    const cleanPath = filePath.replace('mock-s3-url://', '');

    if (config.useMock) {
        console.warn(`[STORAGE MAP] Mock secure download request for: ${cleanPath}`);
        return `mock-secure-download-url://${cleanPath}?expires=${expiresInMinutes}m`;
    }

    // TODO: Implement actual S3 `getSignedUrl` with `GetObjectCommand`
    throw new Error('Real S3 secure download URLs not implemented.');
}
