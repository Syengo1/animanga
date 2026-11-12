// C:\Projects\animanga-platform\api\src\modules\content\services\content-safety.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class ContentSafetyService {
  /**
   * Sanitizes untrusted upstream HTML descriptions (e.g., from AniList/Jikan)
   * while preserving safe typographic formatting tags.
   */
  sanitizeHtml(rawHtml?: string | null): { html: string; text: string } {
    if (!rawHtml) {
      return { html: '', text: '' };
    }

    // 1. Strip script, style, iframe, object, embed, form tags and their contents
    let safeHtml = rawHtml
      .replace(
        /<(script|style|iframe|object|embed|form|svg|math)[^>]*>[\s\S]*?<\/\1>/gi,
        '',
      )
      .replace(
        /<(script|style|iframe|object|embed|form|input|meta|link)[^>]*\/?>/gi,
        '',
      );

    // 2. Strip inline event handlers (e.g. onerror=, onclick=) and javascript: URIs
    safeHtml = safeHtml
      .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/href\s*=\s*["']?\s*javascript:[^"'\s>]+["']?/gi, 'href="#"');

    // 3. Whitelist only safe formatting tags: <br>, <p>, <i>, <em>, <b>, <strong>, <ul>, <ol>, <li>
    safeHtml = safeHtml.replace(
      /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
      (match, tagName: string) => {
        const lower = tagName.toLowerCase();
        const allowed = ['br', 'p', 'i', 'em', 'b', 'strong', 'ul', 'ol', 'li'];
        if (!allowed.includes(lower)) return '';
        if (lower === 'br') return '<br />';
        return match.startsWith('</') ? `</${lower}>` : `<${lower}>`;
      },
    );

    // 4. Derive clean plain-text summary
    const text = safeHtml
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/?[^>]+(>|$)/g, '')
      .replace(/&quot;/g, '"')
      .replace(/&#039;|&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return { html: safeHtml.trim(), text };
  }
}
