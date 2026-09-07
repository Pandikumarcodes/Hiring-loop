import {
  StorageObjectNotFoundError,
  StorageProviderError,
} from './application-storage.js';

/**
 * AWS is dynamically loaded so database/unit tests do not need credentials or
 * a live provider. Production requires @aws-sdk/client-s3 and
 * @aws-sdk/s3-request-presigner; the normal AWS credential-provider chain is
 * deliberately used instead of application-managed access keys.
 */
export function createAwsS3ApplicationStorage({ bucket, region, expiresIn }) {
  let clientPromise;

  async function client() {
    if (!clientPromise) {
      clientPromise = Promise.all([
        import('@aws-sdk/client-s3'),
        import('@aws-sdk/s3-request-presigner'),
      ])
        .then(([s3, presigner]) => ({
          s3,
          presigner,
          client: new s3.S3Client({ region }),
        }))
        .catch(() => {
          throw new StorageProviderError();
        });
    }
    return clientPromise;
  }

  return {
    async createSignedPutUrl({ objectKey, mimeType }) {
      try {
        const runtime = await client();
        const command = new runtime.s3.PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          ContentType: mimeType,
        });
        const url = await runtime.presigner.getSignedUrl(
          runtime.client,
          command,
          {
            expiresIn,
          },
        );
        return { url, requiredHeaders: { 'Content-Type': mimeType } };
      } catch (error) {
        if (error instanceof StorageProviderError) throw error;
        throw new StorageProviderError();
      }
    },

    async createSignedGetUrl({ objectKey, expiresIn: getUrlExpiresIn }) {
      try {
        const runtime = await client();
        const command = new runtime.s3.GetObjectCommand({
          Bucket: bucket,
          Key: objectKey,
        });
        return runtime.presigner.getSignedUrl(runtime.client, command, {
          expiresIn: getUrlExpiresIn,
        });
      } catch (error) {
        if (error instanceof StorageProviderError) throw error;
        throw new StorageProviderError();
      }
    },

    async headObject({ objectKey }) {
      try {
        const runtime = await client();
        const result = await runtime.client.send(
          new runtime.s3.HeadObjectCommand({ Bucket: bucket, Key: objectKey }),
        );
        return {
          contentLength: result.ContentLength,
          contentType: result.ContentType,
        };
      } catch (error) {
        if (
          error?.$metadata?.httpStatusCode === 404 ||
          error?.name === 'NotFound'
        ) {
          throw new StorageObjectNotFoundError();
        }
        if (error instanceof StorageProviderError) throw error;
        throw new StorageProviderError();
      }
    },
  };
}
