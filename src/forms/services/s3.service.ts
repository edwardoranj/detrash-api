import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client as S3AWSClient,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { randomBytes } from 'crypto';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IS3Service } from '../dto/s3.dto';

@Injectable()
export class S3Service implements IS3Service {
  private s3Client: S3AWSClient;
  private readonly tokenLifetime = 3600; // 60 minutes

  constructor(private configService: ConfigService) {
    this.s3Client = new S3AWSClient({
      region: this.configService.get('AWS_DEFAULT_REGION') ?? '',
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    });
  }

  async getPreSignedObjectUrl(fileName: string): Promise<string> {
    const getObjectCommand = new GetObjectCommand({
      Bucket: this.configService.get('BUCKET_NAME') ?? '',
      Key: fileName,
    });

    const authorizedUrlGetObject = await getSignedUrl(
      this.s3Client,
      getObjectCommand,
      {
        expiresIn: this.tokenLifetime,
      },
    );

    console.log('url', authorizedUrlGetObject);

    return authorizedUrlGetObject;
  }

  async createPreSignedObjectUrl(
    fileName: string,
  ): Promise<{ createUrl: string; name: string }> {
    const hash = randomBytes(16);

    const hashedFileName = `${hash.toString('hex')}-${fileName}`;

    const putObjectCommand = new PutObjectCommand({
      Bucket: this.configService.get('BUCKET_NAME') ?? '',
      Key: hashedFileName,
    });

    const authorizedUrlPutObject = await getSignedUrl(
      this.s3Client,
      putObjectCommand,
      { expiresIn: this.tokenLifetime },
    );

    return {
      createUrl: authorizedUrlPutObject,
      name: hashedFileName,
    };
  }
}
