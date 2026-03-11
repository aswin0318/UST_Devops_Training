import UserNotFound from '../../../errors/User/UserNotFound.js'

export default function findUserFactory ({ userRepository }) {
  return async function execute ({ request }, callback) {
    try {
      const {
        payload,
      } = request

      const {
        userName,
        email,
      } = JSON.parse(payload)

      console.log('findUser called with:', { userName, email })

      let user
      if (email) {
        user = await userRepository.findByEmail({ email })
      } else if (userName) {
        user = await userRepository.findByUserName({ userName })
      } else {
        return callback(null, {
          error: JSON.stringify(new UserNotFound('User not found')),
        })
      }

      if (!user) {
        console.log('User not found for:', { userName, email })
        return callback(null, {
          error: JSON.stringify(new UserNotFound('User not found')),
        })
      }

      console.log('Found user:', user.id)

      return callback(null, {
        payload: JSON.stringify({
          ...user,
        }),
      })
    } catch (error) {
      console.error('findUser error:', error.message, error.stack)
      return callback(null, {
        error: JSON.stringify(new UserNotFound('User not found')),
      })
    }
  }
}

