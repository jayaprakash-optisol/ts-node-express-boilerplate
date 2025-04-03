import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';
import env from '../config/env.config';
import { logger } from './logger';
import { IJwtUtil } from '../types/interfaces';

/**
 * JWT utility functions for token generation and verification
 */
export class JwtUtil implements IJwtUtil {
  /**
   * Generate a JWT token
   * @param payload The data to be included in the token
   * @returns The signed JWT token
   */
  generateToken(payload: JwtPayload): string {
    try {
      if (!env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined');
      }

      return jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: parseInt(env.JWT_EXPIRES_IN, 10),
      });
    } catch (error) {
      logger.error('Error generating JWT token:', error);
      throw error;
    }
  }

  /**
   * Verify a JWT token
   * @param token The token to verify
   * @returns The decoded token payload
   */
  verifyToken(token: string): JwtPayload {
    try {
      if (!env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined');
      }

      return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (error) {
      logger.error('Error verifying JWT token:', error);
      throw error;
    }
  }

  /**
   * Decode a JWT token without verification
   * @param token The token to decode
   * @returns The decoded token payload
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch (error) {
      logger.error('Error decoding JWT token:', error);
      return null;
    }
  }
}

// Create singleton instance
export const jwtUtil = new JwtUtil();
