import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthText } from "@/lib/password-validation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  id?: string;
  required?: boolean;
  showStrength?: boolean;
}

export const PasswordInput = ({ 
  value, 
  onChange, 
  label = "Senha",
  placeholder = "••••••••",
  id = "password",
  required = true,
  showStrength = true,
}: PasswordInputProps) => {
  const [validation, setValidation] = useState(validatePassword(value));

  useEffect(() => {
    setValidation(validatePassword(value));
  }, [value]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={validation.errors.length > 0 && value.length > 0 ? 'border-red-500' : ''}
      />
      
      {showStrength && value.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${getPasswordStrengthColor(validation.strength)}`}
                style={{ 
                  width: validation.strength === 'weak' ? '33%' : 
                         validation.strength === 'medium' ? '66%' : '100%' 
                }}
              />
            </div>
            <span className="text-sm font-medium">
              {getPasswordStrengthText(validation.strength)}
            </span>
          </div>
          
          {validation.errors.length > 0 && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <ul className="list-disc list-inside space-y-1">
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
};
