/**
 * File Reader Utility for SSH Private Key File Selection
 * 
 * Provides utility functions for reading files as text with size validation.
 */

/** Maximum file size in bytes (100KB) */
const MAX_FILE_SIZE = 100 * 1024;

/** Error types for file reading operations */
export type FileReadErrorType = 'file_too_large' | 'read_error';

/** Error result from file reading */
export interface FileReadError {
  type: FileReadErrorType;
  message: string;
}

/** Result type for file reading operations */
export type FileReadResult = 
  | { success: true; content: string }
  | { success: false; error: FileReadError };

/**
 * Read a file as text with size validation
 * 
 * @param file - The File object to read
 * @param maxSize - Maximum file size in bytes (default: 100KB)
 * @returns Promise resolving to the file content or error
 * 
 * @example
 * ```typescript
 * const result = await readFileAsText(file);
 * if (result.success) {
 *   console.log(result.content);
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
export async function readFileAsText(
  file: File,
  maxSize: number = MAX_FILE_SIZE
): Promise<FileReadResult> {
  // Check file size
  if (file.size > maxSize) {
    return {
      success: false,
      error: {
        type: 'file_too_large',
        message: `文件过大 (${formatFileSize(file.size)})，私钥文件通常小于 100KB`,
      },
    };
  }

  // Read file content
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result as string;
      resolve({ success: true, content });
    };

    reader.onerror = () => {
      resolve({
        success: false,
        error: {
          type: 'read_error',
          message: '无法读取文件，请确认文件格式',
        },
      });
    };

    reader.readAsText(file);
  });
}

/**
 * Format file size for display
 * 
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 KB", "2.3 MB")
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

