import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

function extractJwtFromCookieOrHeader(req: Request): string | null {
  // Try HttpOnly cookie first, then fall back to Authorization header
  if (req.cookies?.access_token) {
    return req.cookies.access_token;
  }
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: extractJwtFromCookieOrHeader,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  validate(payload: { sub: string; role: string }) {
    return { sub: payload.sub, role: payload.role };
  }
}
