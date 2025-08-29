import { apiRequest } from "@/lib/queryClient";

export type ValidationResult = {
  isValid: boolean;
  type: "validating" | "success" | "error" | "warning" | "info";
  title: string;
  description: string;
};

export async function validateImageForInstallation(file: File): Promise<ValidationResult> {
  try {
    // First validate file type and size
    if (!file.type.startsWith('image/')) {
      return {
        isValid: false,
        type: "error",
        title: "Invalid File Type",
        description: "Please upload a valid image file (JPG, PNG, or TIFF format)."
      };
    }

    if (file.size > 8 * 1024 * 1024) { // 8MB (reduced for better performance)
      return {
        isValid: false,
        type: "error",
        title: "File Too Large",
        description: "Please upload an image smaller than 8MB."
      };
    }

    // Check if API is available before validation
    try {
      const healthResponse = await fetch('/api/health', { 
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      if (!healthResponse.ok) {
        return {
          isValid: false,
          type: "warning",
          title: "Service Unavailable",
          description: "The validation service is currently unavailable. Please try again later."
        };
      }
      
      const healthData = await healthResponse.json();
      if (healthData.ai?.status !== 'online') {
        return {
          isValid: false,
          type: "warning",
          title: "AI Service Offline",
          description: "The AI validation service is currently offline. Please try again later."
        };
      }
    } catch (healthError) {
      // If health check fails, block validation and show try again later
      return {
        isValid: false,
        type: "warning",
        title: "Connection Failed",
        description: "Unable to connect to validation service. Please check your connection and try again later."
      };
    }

    // Create a quick validation endpoint call
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', 'installation');

    const response = await apiRequest('POST', '/api/validate-image', formData);
    const data = await response.json();

    if (data.isValid) {
      return {
        isValid: true,
        type: "success",
        title: "Rooftop Image Validated",
        description: "Rooftop image validated successfully. Ready for AI analysis."
      };
    } else {
      return {
        isValid: false,
        type: "error",
        title: "Invalid Image for Installation Analysis",
        description: "Please upload a rooftop or building image. This feature analyzes roof structures for solar panel installation planning."
      };
    }
  } catch (error) {
    console.error('Image validation error:', error);
    
    if (error instanceof Error) {
      const errorText = error.message.toLowerCase();
      
      if (errorText.includes('not a rooftop') || errorText.includes('no roof')) {
        return {
          isValid: false,
          type: "error",
          title: "Invalid Image for Installation Analysis",
          description: "Please upload a rooftop or building image. This feature analyzes roof structures for solar panel installation planning."
        };
      }
      
      if (errorText.includes('network') || errorText.includes('timeout')) {
        return {
          isValid: false,
          type: "warning",
          title: "Connection Error",
          description: "Network connection failed. Please check your internet connection and try again."
        };
      }
      
      if (errorText.includes('backend not connected') || errorText.includes('server not available')) {
        return {
          isValid: false,
          type: "warning",
          title: "Server Unavailable",
          description: "The server is currently unavailable. Please try again later."
        };
      }
    }
    
    // If validation fails due to network/service issues, block upload
    return {
      isValid: false,
      type: "error",
      title: "Validation Failed",
      description: "Unable to validate image due to service issues. Please try again later."
    };
  }
}

export async function validateImageForFaultDetection(file: File): Promise<ValidationResult> {
  try {
    // First validate file type and size
    if (!file.type.startsWith('image/')) {
      return {
        isValid: false,
        type: "error",
        title: "Invalid File Type",
        description: "Please upload a valid image file (JPG, PNG, or TIFF format)."
      };
    }

    if (file.size > 8 * 1024 * 1024) { // 8MB (reduced for better performance)
      return {
        isValid: false,
        type: "error",
        title: "File Too Large",
        description: "Please upload an image smaller than 8MB."
      };
    }

    // Quick API availability check to prevent wastage
    try {
      const healthResponse = await fetch('/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(3000) // Reduced to 3 seconds to save time
      });
      if (!healthResponse.ok) {
        return {
          isValid: false,
          type: "warning",
          title: "Service Unavailable",
          description: "Please try again in a few moments."
        };
      }
      
      const healthData = await healthResponse.json();
      if (healthData.ai?.status !== 'online') {
        return {
          isValid: false,
          type: "warning",
          title: "AI Service Offline",
          description: "Please try again later when service is available."
        };
      }
    } catch (healthError) {
      return {
        isValid: false,
        type: "warning",
        title: "Connection Failed",
        description: "Please check your connection and try again."
      };
    }

    // Create a quick validation endpoint call
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', 'fault-detection');

    const response = await apiRequest('POST', '/api/validate-image', formData);
    const data = await response.json();

    if (data.isValid) {
      return {
        isValid: true,
        type: "success",
        title: "Solar Panel Image Validated",
        description: "Solar panel image validated successfully. Ready for fault detection analysis."
      };
    } else {
      return {
        isValid: false,
        type: "error",
        title: "Invalid Image for Fault Detection",
        description: "Please upload a solar panel image. This feature analyzes existing solar panel installations for defects and performance issues."
      };
    }
  } catch (error) {
    console.error('Image validation error:', error);
    
    if (error instanceof Error) {
      const errorText = error.message.toLowerCase();
      
      if (errorText.includes('not solar panel') || errorText.includes('no solar')) {
        return {
          isValid: false,
          type: "error",
          title: "Invalid Image for Fault Detection",
          description: "Please upload a solar panel image. This feature analyzes existing solar panel installations for defects and performance issues."
        };
      }
      
      if (errorText.includes('network') || errorText.includes('timeout')) {
        return {
          isValid: false,
          type: "warning",
          title: "Connection Error",
          description: "Network connection failed. Please check your internet connection and try again."
        };
      }
      
      if (errorText.includes('backend not connected') || errorText.includes('server not available')) {
        return {
          isValid: false,
          type: "warning",
          title: "Server Unavailable",
          description: "The server is currently unavailable. Please try again later."
        };
      }
    }
    
    // If validation fails, block upload and show try again later
    return {
      isValid: false,
      type: "warning",
      title: "Validation Failed",
      description: "Image validation failed. Please try again later when service is available."
    };
  }
}