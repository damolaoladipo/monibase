import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Device info attached to request (troott-api detectDevice.mdw pattern).
 */
export interface DeviceInfo {
  device: string;
  os: string;
  browser: string;
  userAgent: string;
}

declare global {
  namespace Express {
    interface Request {
      device?: DeviceInfo;
    }
  }
}

/**
 * Lightweight User-Agent parsing (no external deps).
 * For full device detection consider node-device-detector.
 */
function parseUserAgent(ua: string): DeviceInfo {
  let device = 'unknown';
  let os = 'unknown';
  let browser = 'unknown';

  if (!ua || typeof ua !== 'string') {
    return { device, os, browser, userAgent: ua ?? '' };
  }

  if (/\b(iPad|iPhone|iPod|Android|Mobile|webOS|BlackBerry|IEMobile)\b/i.test(ua)) {
    device = /iPad/i.test(ua) ? 'iPad' : /iPhone|iPod/i.test(ua) ? 'iPhone' : /Android/i.test(ua) ? 'Android' : 'Mobile';
  } else if (/\b(Windows|Macintosh|Linux)\b/i.test(ua)) {
    device = 'Desktop';
  }

  if (/\bWindows NT\b/i.test(ua)) os = 'Windows';
  else if (/\bMac OS X\b/i.test(ua)) os = 'Mac OS';
  else if (/\bAndroid\b/i.test(ua)) os = 'Android';
  else if (/\biOS\b/i.test(ua) || /\b(iPhone|iPad) OS\b/i.test(ua)) os = 'iOS';
  else if (/\bLinux\b/i.test(ua)) os = 'Linux';

  if (/\bChrome\b/i.test(ua) && !/\bEdge\b/i.test(ua)) browser = 'Chrome';
  else if (/\bEdge\b/i.test(ua)) browser = 'Edge';
  else if (/\bFirefox\b/i.test(ua)) browser = 'Firefox';
  else if (/\bSafari\b/i.test(ua) && !/\bChrome\b/i.test(ua)) browser = 'Safari';
  else if (/\bOPR\b/i.test(ua)) browser = 'Opera';

  return { device, os, browser, userAgent: ua };
}

@Injectable()
export class DeviceDetectionMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const ua = req.headers['user-agent'] ?? '';
    req.device = parseUserAgent(ua);
    next();
  }
}
