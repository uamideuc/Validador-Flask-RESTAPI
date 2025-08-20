import axios from 'axios';

// Configure axios defaults
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
  session_id: number;
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

  static async downloadExport(exportId: number, suggestedFilename?: string): Promise<void> {
    const response = await axios.get(`/api/export/${exportId}/download`, {
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
}

export default ApiService;