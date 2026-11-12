import * as React from 'react';
import { useState } from 'react';
import { landService } from '../services/index.js';
import { validateKenyanLandReference, suggestLandReferenceFormat, ValidationResult } from '../utils/validation.js';

interface LandRegistrationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const LandRegistrationForm: React.FC<LandRegistrationFormProps> = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    parcelId: '',
    location: '',
    area: '',
    documentHash: '',
    description: ''
  });
  
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleParcelIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, parcelId: value });
    
    // Real-time validation
    if (value.trim()) {
      const result = validateKenyanLandReference(value);
      setValidation(result);
    } else {
      setValidation(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate parcel ID
    const validationResult = validateKenyanLandReference(formData.parcelId);
    if (!validationResult.isValid) {
      setError(validationResult.error || 'Invalid parcel ID format');
      return;
    }
    
    // Validate area
    const areaNum = parseFloat(formData.area);
    if (isNaN(areaNum) || areaNum <= 0) {
      setError('Area must be a positive number');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await landService.register({
        parcelId: validationResult.normalized || formData.parcelId,
        location: formData.location,
        area: areaNum,
        documentHash: formData.documentHash || undefined
      });
      
      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 2000);
      
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Failed to register land. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <svg className="w-16 h-16 text-green-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-xl font-bold text-green-800 mb-2">Land Registered Successfully!</h3>
        <p className="text-green-600">Your land registration has been submitted for officer approval.</p>
        <button
          onClick={onCancel}
          className="mt-4 text-green-700 hover:text-green-800 font-medium"
        >
          Register Another Land
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Parcel ID Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Parcel ID / Land Reference *
        </label>
        <input
          type="text"
          value={formData.parcelId}
          onChange={handleParcelIdChange}
          className={`mt-1 block w-full rounded-lg shadow-sm p-2.5 border ${
            validation?.isValid === false
              ? 'border-red-500 focus:ring-red-500'
              : validation?.isValid
              ? 'border-green-500 focus:ring-green-500'
              : 'border-gray-300 focus:ring-blue-500'
          } focus:outline-none focus:ring-2`}
          placeholder="e.g., LR12345/2025"
          required
        />
        
        {/* Validation Feedback */}
        {validation && (
          <div className="mt-2">
            {validation.isValid ? (
              <div className="text-green-600 text-sm flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Valid {validation.format?.replace('Format', '')} format
              </div>
            ) : (
              <div className="text-red-600 text-sm">
                {validation.error}
                <button
                  type="button"
                  onClick={() => alert(suggestLandReferenceFormat())}
                  className="ml-2 text-blue-600 hover:text-blue-800 underline"
                >
                  Show examples
                </button>
              </div>
            )}
          </div>
        )}
        
        <p className="mt-1 text-xs text-gray-500">
          Enter in Kenyan Land Registry format. Examples: LR12345/2025, Nairobi/Block/123/Plot/456, KSM/12345
        </p>
      </div>

      {/* Location Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Location / Address *
        </label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          className="block w-full rounded-lg border border-gray-300 shadow-sm p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Nairobi, Kasarani, Plot 123"
          required
        />
      </div>

      {/* Area Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Area (in acres or square meters) *
        </label>
        <input
          type="number"
          step="0.01"
          value={formData.area}
          onChange={(e) => setFormData({ ...formData, area: e.target.value })}
          className="block w-full rounded-lg border border-gray-300 shadow-sm p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0.00"
          required
        />
        <p className="mt-1 text-xs text-gray-500">
          Enter the land size. Use decimals for partial acres (e.g., 0.5 for half acre)
        </p>
      </div>

      {/* Document Hash (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Document Hash (Optional)
        </label>
        <input
          type="text"
          value={formData.documentHash}
          onChange={(e) => setFormData({ ...formData, documentHash: e.target.value })}
          className="block w-full rounded-lg border border-gray-300 shadow-sm p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="IPFS hash or document identifier"
        />
        <p className="mt-1 text-xs text-gray-500">
          Optional: Add a reference to supporting documents (e.g., title deed hash)
        </p>
      </div>

      {/* Description (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description (Optional)
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="block w-full rounded-lg border border-gray-300 shadow-sm p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Additional details about the land..."
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Form Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting || (validation && !validation.isValid && formData.parcelId.trim() !== '')}
          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50"
        >
          {isSubmitting ? 'Registering...' : 'Register Land'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};