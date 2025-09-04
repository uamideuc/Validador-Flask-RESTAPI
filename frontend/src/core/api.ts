import axios from 'axios';

// En producción, Render asignará la URL del backend a esta variable de entorno.
// En desarrollo, será undefined y React usará el proxy de package.json.
axios.defaults.baseURL = process.env.REACT_APP_API_URL;

// Configure axios to automatically include auth token
axios.interceptors.request.use(
  (config) => {
    // Log only suspicious requests to root
    if (config.url === '/' || config.url === '') {
      console.warn('SUSPICIOUS REQUEST TO ROOT:', {
        method: config.method,
        url: config.url,
        baseURL: config.baseURL,
        stack: new Error().stack
      });
    }
    
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Configure response interceptor to handle auth errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('accessToken');
      localStorage.removeItem('sessionId');
      
      // Redirect to login if we're not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.reload(); // Force reload to show login screen
      }
    }
    return Promise.reject(error);
  }
);

export interface UploadResponse {
  success: boolean;
  upload_id: number;
  file_id: string;
  filename: string;
  file_size: number;
  file_extension: string;
  is_excel: boolean;
  is_csv: boolean;
  sheet_names?: string[];
  sheet_count?: number;
  requires_sheet_selection?: boolean;
}

export interface ParseResponse {
  success: boolean;
  upload_id: number;
  filename: string;
  variables: string[];
  sample_values: Record<string, string[]>;
  statistics: {
    total_rows: number;
    total_columns: number;
    empty_cells: number;
    memory_usage: number;
  };
  sheet_name?: string;
}

export interface VariableCategorization {
  instrument_vars: string[];
  item_id_vars: string[];
  metadata_vars: string[];
  classification_vars: string[];
  other_vars: string[];
}

export interface ValidationResponse {
  success: boolean;
  upload_id: number;
  validation_session_id: number;
  categorization: VariableCategorization;
  message: string;
}

export class ApiService {
  static async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post('/api/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  }

  static async getSheets(uploadId: number): Promise<{ sheet_names: string[]; sheet_count: number }> {
    const response = await axios.get(`/api/files/${uploadId}/sheets`);
    return response.data;
  }

  static async parseFile(uploadId: number, sheetName?: string): Promise<ParseResponse> {
    const requestData = sheetName ? { sheet_name: sheetName } : {};
    
    const response = await axios.post(`/api/files/${uploadId}/parse`, requestData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  }

  static async getVariables(uploadId: number): Promise<{ variables: string[]; status: string }> {
    const response = await axios.get(`/api/files/${uploadId}/variables`);
    return response.data;
  }

  static async saveCategorization(uploadId: number, categorization: VariableCategorization): Promise<ValidationResponse> {
    const response = await axios.post(`/api/files/${uploadId}/categorization`, categorization, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  }

  static async preValidateCategorization(uploadId: number, categorization: VariableCategorization): Promise<any> {
    const response = await axios.post(`/api/files/${uploadId}/pre-validate-categorization`, categorization, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  }

  static async getDataPreview(uploadId: number, sheetName?: string, startRow: number = 0, rowsPerPage: number = 10): Promise<any> {
    const response = await axios.post(`/api/files/${uploadId}/preview`, {
      sheet_name: sheetName,
      start_row: startRow,
      rows_per_page: rowsPerPage
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  }

  static async exportNormalizedData(sessionId: number): Promise<{ success: boolean; export_id: number; filename: string }> {
    const response = await axios.post('/api/export/normalized', {
      session_id: sessionId
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  }

  static async exportValidationExcel(sessionId: number): Promise<{ success: boolean; export_id: number; filename: string }> {
    const response = await axios.post(`/api/export/validation-excel/${sessionId}`, {}, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  }

  static async exportValidationPDF(sessionId: number): Promise<{ success: boolean; export_id: number; filename: string }> {
    const response = await axios.post(`/api/export/validation-report/${sessionId}`, {}, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  }

  static async runValidation(sessionId: number): Promise<{ success: boolean; validation_report?: any; error?: string }> {
    // Use new ToolKit API
    const response = await axios.post('/api/tools/ensamblaje/run', {
      session_id: sessionId
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  }

  static async downloadExport(exportId: number, suggestedFilename?: string): Promise<void> {
    const response = await axios.get(`/api/tools/ensamblaje/download/${exportId}`, {
      responseType: 'blob',
    });

    // Debug logging
    console.log('Export ID:', exportId);
    console.log('Suggested filename:', suggestedFilename);
    console.log('Response headers:', response.headers);
    console.log('Content-Disposition:', response.headers['content-disposition']);

    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Use suggested filename first, then try headers
    let filename = suggestedFilename || 'download.xlsx';
    
    // Get filename from response headers - try multiple patterns
    const contentDisposition = response.headers['content-disposition'] || response.headers['Content-Disposition'];
    
    if (contentDisposition) {
      console.log('Found Content-Disposition:', contentDisposition);
      // Try different patterns for filename extraction
      const patterns = [
        /filename\*?="([^"]+)"/,
        /filename\*?=([^;]+)/,
        /filename="([^"]+)"/,
        /filename=([^;]+)/
      ];
      
      for (const pattern of patterns) {
        const match = contentDisposition.match(pattern);
        if (match) {
          filename = match[1].trim();
          console.log('Extracted filename from header:', filename);
          break;
        }
      }
    }
    
    console.log('Final filename:', filename);
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  // ToolKit API methods
  static async getAvailableTools(): Promise<{ success: boolean; tools?: any; error?: string }> {
    const response = await axios.get('/api/tools/available');
    return response.data;
  }

  static async runToolValidation(toolName: string, sessionId: number): Promise<{ success: boolean; validation_report?: any; error?: string }> {
    const response = await axios.post(`/api/tools/${toolName}/run`, {
      session_id: sessionId
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  }

  static async getToolVariableValues(toolName: string, validationSessionId: number, variable: string, instrument?: string): Promise<{ success: boolean; values_data?: any; error?: string }> {
    const response = await axios.post(`/api/tools/${toolName}/variable-values`, {
      validation_session_id: validationSessionId,
      variable: variable,
      instrument: instrument
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  }

  static async exportToolData(toolName: string, validationSessionId: number, exportType: string): Promise<{ success: boolean; export_id?: number; error?: string }> {
    const response = await axios.post(`/api/tools/${toolName}/export`, {
      validation_session_id: validationSessionId,
      export_type: exportType
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  }

  static async getToolMetadata(toolName: string): Promise<{ success: boolean; metadata?: any; error?: string }> {
    const response = await axios.get(`/api/tools/${toolName}/metadata`);
    return response.data;
  }
}

export default ApiService;