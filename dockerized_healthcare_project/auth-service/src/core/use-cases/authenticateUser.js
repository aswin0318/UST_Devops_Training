export default function authenticateUserFactory ({
  UserService,
  sessionRepository,
  encrypter,
}) {
  return async function execute ({ request }, callback) {
    try {
      const {
        payload,
      } = request

      const {
        email,
        password,
        keepSigned = false,
      } = JSON.parse(payload)

      console.log('authenticateUser called with email:', email)

      const {
        payload: userPayload = null,
        error = null,
      } = await UserService.findUser({
        payload: JSON.stringify({ email }),
      })

      if (error) {
        console.log('User not found error:', error)
        return callback(null, {
          error,
        })
      }

      const user = JSON.parse(userPayload)
      console.log('Found user:', user.userName)

      const {
        id: userId,
        passwordHash,
        passwordSalt,
      } = user

      const isPasswordValid = encrypter.compare({
        passwordHash,
        passwordSalt,
        password,
      })

      if (!isPasswordValid) {
        console.log('Invalid password for user:', email)
        return callback(null, {
          error: JSON.stringify(new InvalidPassword('Invalid password error')),
        })
      }

      const createdSession = await sessionRepository.create({
        userId,
        keepSigned,
      })

      const { id } = createdSession

      console.log('Session created:', id)

      return callback(null, {
        payload: JSON.stringify({ sessionId: id }),
      })
    } catch (error) {
      console.error('authenticateUser error:', error.message, error.stack)
      return callback(null, {
        error: JSON.stringify({ message: error.message, errorCode: 'SE500' }),
      })
    }
  }
}

