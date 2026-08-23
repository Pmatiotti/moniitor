export const validatePassword = (password: string): { 
  isValid: boolean; 
  errors: string[]; 
  strength: 'weak' | 'medium' | 'strong' 
} => {
  const errors: string[] = [];
  let strength: 'weak' | 'medium' | 'strong' = 'weak';

  if (password.length < 8) {
    errors.push("A senha deve ter no mínimo 8 caracteres");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("A senha deve conter pelo menos uma letra maiúscula");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("A senha deve conter pelo menos uma letra minúscula");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("A senha deve conter pelo menos um número");
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("A senha deve conter pelo menos um caractere especial");
  }

  // Calculate strength
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const criteriasMet = [hasLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

  if (criteriasMet <= 2) {
    strength = 'weak';
  } else if (criteriasMet <= 4) {
    strength = 'medium';
  } else {
    strength = 'strong';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
};

/**
 * Check if a password has been exposed in data breaches using HaveIBeenPwned API.
 * Uses k-anonymity: only the first 5 chars of SHA-1 hash are sent to the API.
 * The password itself is never transmitted.
 */
export const checkPasswordBreached = async (password: string): Promise<{ 
  isBreached: boolean; 
  count: number;
  error?: string;
}> => {
  try {
    // Convert password to SHA-1 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    
    // Get first 5 chars (prefix) and the rest (suffix)
    const prefix = hashHex.substring(0, 5);
    const suffix = hashHex.substring(5);
    
    // Query HIBP API with k-anonymity
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'Add-Padding': 'true', // Adds padding to prevent response size analysis
      },
    });
    
    if (!response.ok) {
      throw new Error(`HIBP API error: ${response.status}`);
    }
    
    const text = await response.text();
    const lines = text.split('\n');
    
    // Check if our hash suffix appears in the response
    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        return { 
          isBreached: true, 
          count: parseInt(count.trim(), 10) 
        };
      }
    }
    
    return { isBreached: false, count: 0 };
  } catch (error: any) {
    console.error('Error checking password breach:', error);
    // Return non-blocking error - don't prevent registration if API fails
    return { 
      isBreached: false, 
      count: 0, 
      error: error.message 
    };
  }
};

export const getPasswordStrengthColor = (strength: 'weak' | 'medium' | 'strong'): string => {
  switch (strength) {
    case 'weak':
      return 'bg-red-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'strong':
      return 'bg-green-500';
    default:
      return 'bg-gray-300';
  }
};

export const getPasswordStrengthText = (strength: 'weak' | 'medium' | 'strong'): string => {
  switch (strength) {
    case 'weak':
      return 'Fraca';
    case 'medium':
      return 'Média';
    case 'strong':
      return 'Forte';
    default:
      return '';
  }
};
