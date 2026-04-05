import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

function extractRefreshToken(req: Request): string | null {
  // Try HttpOnly cookie first, then fall back to body field
  if (req.cookies?.refresh_token) {
    return req.cookies.refresh_token;
  }
  return ExtractJwt.fromBodyField('refreshToken')(req);
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: extractRefreshToken,
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET'),
    });
  }

  validate(payload: { sub: string; role: string }) {
    return { sub: payload.sub, role: payload.role };
  }
}
