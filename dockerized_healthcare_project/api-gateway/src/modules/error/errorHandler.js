import ErrorCodes from './ErrorCodes.js'

const getStatusCode = (errorCode) => {
  let statusCodes = {}

  Object.values(ErrorCodes).forEach((code) => {
    const [,, ...statusCode] = code
    statusCodes = {
      ...statusCodes,
      [code]: statusCode.join(''),
    }
  })

  return statusCodes[errorCode] || 500
}

export default function errorHandler (error) {
  try {
    // Try to parse error as JSON string
    const parsed = typeof error === 'string' ? JSON.parse(error) : error
    const { body } = parsed
    const { message, errorCode } = body

    return {
      statusCode: getStatusCode(errorCode),
      body: {
        error: message,
      },
    }
  } catch (e) {
    // If parsing fails, return generic error
    return {
      statusCode: 500,
      body: {
        error: typeof error === 'string' ? error : error?.message || 'Internal Server Error',
      },
    }
  }
}
