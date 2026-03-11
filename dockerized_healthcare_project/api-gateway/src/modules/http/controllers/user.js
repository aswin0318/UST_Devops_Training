export default function userControllerFactory ({
  UserService,
  AuthenticationService,
  errorHandler,
}) {
  async function create ({ body }) {
    try {
      const {
        payload = null,
        error = null,
      } = await UserService.createUser({
        payload: JSON.stringify(body),
      })

      if (error) {
        return errorHandler(error)
      }

      return {
        body: JSON.parse(payload),
        statusCode: 201,
      }
    } catch (err) {
      console.error('User.create error:', err.message, err.stack)
      return {
        statusCode: 500,
        body: {
          error: err.message || 'Failed to create user',
        },
      }
    }
  }

  async function authenticate ({ body }) {
    try {
      const {
        payload = null,
        error = null,
      } = await AuthenticationService.authenticateUser({
        payload: JSON.stringify(body),
      })

      if (error) {
        return errorHandler(error)
      }

      return {
        body: JSON.parse(payload),
        statusCode: 200,
      }
    } catch (err) {
      return {
        statusCode: 500,
        body: {
          error: err.message || 'Failed to authenticate user',
        },
      }
    }
  }

  return {
    create,
    authenticate,
  }
}
