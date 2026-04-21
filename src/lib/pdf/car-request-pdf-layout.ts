import type { ExpresswayOption } from '@prisma/client';
import { existsSync } from 'fs';
import { join } from 'path';

/** Layout variant for signature boxes (adjust per official PDF design). */
export type CarRequestPdfLayoutKey = 'EXPRESSWAY' | 'NO_EXPRESSWAY';

export type RequesterSignatureLayout = {
  areaX1: number;
  areaX2: number;
  yBottom: number;
  yTop: number;
};

export type ExecutiveSignatureLayout = {
  areaX1: number;
  areaX2: number;
  yBottom: number;
  maxY: number;
  /** Second stamp: y = pageHeight - this value (PDF coords from bottom edge). */
  secondOffsetFromPageBottom: number;
};

export type CarRequestPdfLayout = {
  requester: RequesterSignatureLayout;
  executive: ExecutiveSignatureLayout;
};

/**
 * Signature geometry per template variant.
 * NO_EXPRESSWAY matches the original car-request-template coordinates.
 * EXPRESSWAY: tune when the expressway PDF is finalized.
 */
export const CAR_REQUEST_PDF_LAYOUT: Record<CarRequestPdfLayoutKey, CarRequestPdfLayout> = {
  NO_EXPRESSWAY: {
    requester: {
      areaX1: 257,
      areaX2: 417,
      yBottom: 493,
      yTop: 523,
    },
    executive: {
      areaX1: 256,
      areaX2: 420,
      yBottom: 420,
      maxY: 382,
      secondOffsetFromPageBottom: 570,
    },
  },
  EXPRESSWAY: {
    requester: {
      areaX1: 257,
      areaX2: 417,
      yBottom: 503,
      yTop: 533,
    },
    executive: {
      areaX1: 256,
      areaX2: 420,
      yBottom: 430,
      maxY: 392,
      secondOffsetFromPageBottom: 560,
    },
  },
};

const TEMPLATE_CANDIDATES = {
  EXPRESSWAY: ['car-request-template-expressway.pdf', 'car-request-template-expressway.pdf.pdf'],
  NO_EXPRESSWAY: ['car-request-template-no-expressway.pdf', 'car-request-template-no-expressway.pdf.pdf'],
} as const;

const LEGACY_TEMPLATE_CANDIDATES = ['car-request-template.pdf', 'car-request-template.pdf.pdf'] as const;

function firstExisting(baseDir: string, names: readonly string[]): string | null {
  for (const name of names) {
    const p = join(baseDir, name);
    if (existsSync(p)) return p;
  }
  return null;
}

export type ResolvedCarRequestTemplate =
  | { ok: true; templatePath: string; layoutKey: CarRequestPdfLayoutKey }
  | { ok: false; error: string };

/**
 * Pick PDF file and signature layout from booking.expresswayOption.
 * - EXPRESSWAY / NO_EXPRESSWAY: prefer variant-specific file, then legacy single template.
 * - null (legacy rows): prefer legacy template, then no-expressway file. Layout: NO_EXPRESSWAY.
 */
export function resolveCarRequestTemplate(expresswayOption: ExpresswayOption | null): ResolvedCarRequestTemplate {
  const templatesDir = join(process.cwd(), 'public', 'templates');

  if (expresswayOption === 'EXPRESSWAY') {
    const path =
      firstExisting(templatesDir, TEMPLATE_CANDIDATES.EXPRESSWAY) ??
      firstExisting(templatesDir, LEGACY_TEMPLATE_CANDIDATES);
    if (!path) return { ok: false, error: 'Template file missing' };
    return { ok: true, templatePath: path, layoutKey: 'EXPRESSWAY' };
  }

  if (expresswayOption === 'NO_EXPRESSWAY') {
    const path =
      firstExisting(templatesDir, TEMPLATE_CANDIDATES.NO_EXPRESSWAY) ??
      firstExisting(templatesDir, LEGACY_TEMPLATE_CANDIDATES);
    if (!path) return { ok: false, error: 'Template file missing' };
    return { ok: true, templatePath: path, layoutKey: 'NO_EXPRESSWAY' };
  }

  const path =
    firstExisting(templatesDir, LEGACY_TEMPLATE_CANDIDATES) ??
    firstExisting(templatesDir, TEMPLATE_CANDIDATES.NO_EXPRESSWAY) ??
    firstExisting(templatesDir, TEMPLATE_CANDIDATES.EXPRESSWAY);
  if (!path) return { ok: false, error: 'Template file missing' };
  return { ok: true, templatePath: path, layoutKey: 'NO_EXPRESSWAY' };
}
