/**
 * Utility functions for error handling
 */

export function getErrorMessage(error: any): string {
  // Try to extract error message from various error formats
  if (error?.response?.data?.detail && typeof error.response.data.detail === 'string') {
    return error.response.data.detail
  }
  
  if (error?.response?.data?.message && typeof error.response.data.message === 'string') {
    return error.response.data.message
  }
  
  if (error?.message && typeof error.message === 'string') {
    return error.message
  }
  
  // Handle FastAPI validation errors (422)
  if (error?.response?.data && typeof error.response.data === 'object') {
    const data = error.response.data
    if (data.detail && Array.isArray(data.detail)) {
      // FastAPI validation error with multiple fields
      const errors = data.detail.map((err: any) => {
        if (err.loc && err.msg) {
          const field = err.loc[err.loc.length - 1]
          return `${field}: ${err.msg}`
        }
        return err.msg || 'Validation error'
      })
      return errors.join(', ')
    }
  }
  
  // Fallback
  return 'An error occurred'
}
