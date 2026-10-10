import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret
});

export const isCloudinaryConfigured = Boolean(
  env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret
);

export { cloudinary };
