/**
 * Conversion audio.
 *
 * Décision documentée (étape 3) : AUCUNE bibliothèque de
 * conversion n’est intégrée, car aucune n’a pu être
 * vérifiée dans cet environnement (pas de SDK Android
 * pour compiler/tester). FFmpegKit a été évalué
 * (voir docs/TECHNOLOGIES.md) : licence GPL/LGPL
 * incompatible avec le MIT de l'application sans
 * vérification juridique, et intégration non vérifiable
 * ici.
 *
 * Règles respectées :
 *  - jamais de simulation de conversion ;
 *  - le format source MP3 n’est JAMAIS reconverti
 *    (opération inutile évitée) ;
 *  - si un format ne peut pas être converti, la
 *    limitation est claire et le fichier source
 *    téléchargé est préservé.
 */

export type AudioFormat = 'mp3' | 'ogg' | 'flac' | 'm4a';

export interface ConversionRequest {
  /** URI local du fichier téléchargé. */
  localUri: string;
  sourceFormat: AudioFormat;
  targetFormat: AudioFormat;
}

export interface ConversionResult {
  converted: boolean;
  outputUri?: string;
  reason?: string;
}

export interface ConversionManager {
  /** Aucune solution vérifiée à ce jour. */
  readonly available: boolean;
  readonly reason: string;
  /** Une conversion est-elle nécessaire ? */
  isConversionNeeded(source: AudioFormat, target: AudioFormat): boolean;
  convert(request: ConversionRequest): Promise<ConversionResult>;
}

export class ConversionManagerStub implements ConversionManager {
  readonly available = false;
  readonly reason =
    'CONVERSION_NOT_INTEGRATED : aucune bibliothèque de conversion ' +
    'n’a été vérifiée comme compatible Android (licence et binaires). ' +
    'Le fichier source téléchargé est conservé tel quel.';

  isConversionNeeded(source: AudioFormat, target: AudioFormat): boolean {
    // Déjà au format souhaité : aucune opération inutile.
    return source !== target;
  }

  async convert(request: ConversionRequest): Promise<ConversionResult> {
    // Jamais de simulation : refus explicite, fichier source préservé.
    return {
      converted: false,
      reason: `${this.reason} (demande : ${request.sourceFormat} → ${request.targetFormat})`,
    };
  }
}

/** Format déduit du nom de fichier (extension). */
export function formatFromName(name: string): AudioFormat {
  const lower = name.toLowerCase();
  if (lower.endsWith('.ogg')) return 'ogg';
  if (lower.endsWith('.flac')) return 'flac';
  if (lower.endsWith('.m4a') || lower.endsWith('.aac')) return 'm4a';
  return 'mp3';
}
