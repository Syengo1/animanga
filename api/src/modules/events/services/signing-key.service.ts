import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { SigningKey, KeyStatus } from '../entities/signing-key.entity';

@Injectable()
export class SigningKeyService {
  private readonly logger = new Logger(SigningKeyService.name);
  private cachedActiveKey: SigningKey | null = null;
  // Cache to store public keys in memory for high-throughput scanning
  private readonly publicKeyCache = new Map<string, SigningKey>();

  constructor(
    @InjectRepository(SigningKey)
    private readonly keyRepo: Repository<SigningKey>,
    private readonly configService: ConfigService,
  ) {}

  async getActiveKey(): Promise<SigningKey> {
    if (this.cachedActiveKey) return this.cachedActiveKey;

    const activeKey = await this.keyRepo.findOne({
      where: { status: KeyStatus.ACTIVE },
      order: { validFrom: 'DESC' },
    });

    if (!activeKey) {
      this.logger.error('No active signing key found in the database.');
      throw new InternalServerErrorException(
        'System configuration error: Missing signing key',
      );
    }

    this.cachedActiveKey = activeKey;
    this.publicKeyCache.set(activeKey.id, activeKey);
    return activeKey;
  }

  async getKeyById(keyId: string): Promise<SigningKey | null> {
    if (this.publicKeyCache.has(keyId)) {
      return this.publicKeyCache.get(keyId);
    }

    const key = await this.keyRepo.findOne({ where: { id: keyId } });
    if (key) {
      this.publicKeyCache.set(keyId, key);
    }
    return key;
  }

  verifySignature(
    canonicalPayload: string,
    signatureBase64: string,
    publicKeyPem: string,
  ): boolean {
    try {
      return crypto.verify(
        null,
        Buffer.from(canonicalPayload),
        crypto.createPublicKey(publicKeyPem),
        Buffer.from(signatureBase64, 'base64'),
      );
    } catch (error) {
      this.logger.debug('Signature verification threw an error', error);
      return false;
    }
  }

  signPayload(payload: string): { signature: string; keyId: string } {
    if (!this.cachedActiveKey) {
      throw new InternalServerErrorException('Active key not loaded');
    }

    const privateKeyRaw = this.configService.get<string>('TICKET_PRIVATE_KEY');

    if (!privateKeyRaw) {
      throw new InternalServerErrorException(
        'Private key not configured in environment',
      );
    }

    try {
      const privateKey = crypto.createPrivateKey(privateKeyRaw);
      const signature = crypto.sign(null, Buffer.from(payload), privateKey);

      return {
        signature: signature.toString('base64'),
        keyId: this.cachedActiveKey.id,
      };
    } catch (error) {
      this.logger.error('Failed to sign ticket payload', error);
      throw new InternalServerErrorException('Cryptographic signing failed');
    }
  }
}
