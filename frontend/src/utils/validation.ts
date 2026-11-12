/**
 * Kenyan Land Registry Parcel ID Validation
 * Supports multiple Kenyan land reference formats
 */

// Regular expressions for different Kenyan land reference formats
const landReferencePatterns = {
  // LR format: LR12345/2025 or LR/12345/2025
  lrFormat: /^LR\/?\d{5}\/\d{4}$/,
  
  // Nairobi Block/Plot format: Nairobi/Block/123/Plot/456
  nairobiFormat: /^Nairobi\/Block\/\d+\/Plot\/\d+$/i,
  
  // Mombasa format: MN/I/1234 or Mombasa/1234
  mombasaFormat: /^(MN\/I\/\d+|Mombasa\/\d+)$/i,
  
  // Kisumu format: KSM/12345
  kisumuFormat: /^KSM\/\d{5}$/i,
  
  // Nakuru format: NAK/12345
  nakuruFormat: /^NAK\/\d{5}$/i,
  
  // Eldoret format: ELD/12345
  eldoretFormat: /^ELD\/\d{5}$/i,
  
  // General format: Any letters/numbers with slashes (minimum 5 chars)
  generalFormat: /^[A-Z]{2,}\/?\d{3,}(\/\d+)?$/
};

export interface ValidationResult {
  isValid: boolean;
  format?: string;
  error?: string;
  normalized?: string;
}

export const validateKenyanLandReference = (parcelId: string): ValidationResult => {
  const trimmedId = parcelId.trim().toUpperCase();
  
  if (!trimmedId) {
    return {
      isValid: false,
      error: 'Parcel ID is required'
    };
  }
  
  // Check against each format
  for (const [format, pattern] of Object.entries(landReferencePatterns)) {
    if (pattern.test(trimmedId)) {
      // Normalize to a consistent format if needed
      let normalized = trimmedId;
      if (format === 'lrFormat' && trimmedId.startsWith('LR/')) {
        normalized = trimmedId; // Keep as is
      } else if (format === 'lrFormat') {
        normalized = trimmedId; // Already LR12345/2025 format
      }
      
      return {
        isValid: true,
        format,
        normalized
      };
    }
  }
  
  // If no pattern matches, provide helpful error message
  return {
    isValid: false,
    error: 'Invalid Kenyan land reference format. Examples: LR12345/2025, Nairobi/Block/123/Plot/456, KSM/12345'
  };
};

// Helper to generate a suggestion for valid format
export const suggestLandReferenceFormat = (): string => {
  return `Valid formats:
  • LR12345/2025 (Land Registry)
  • Nairobi/Block/123/Plot/456 (Nairobi area)
  • KSM/12345 (Kisumu)
  • MOM/12345 (Mombasa)
  • NAK/12345 (Nakuru)`;
};