import UserAlreadyExists from '../../../errors/User/UserAlreadyExists.js'
import InternalError from '../../../errors/Internal.js'

export default function createUserFactory ({
  userRepository,
  encrypter,
}) {
  return async function execute ({ request }, callback) {
    try {
      const {
        payload,
      } = request

      console.log('createUser received payload:', payload)
      
      const parsedData = JSON.parse(payload)
      
      // Accept both 'userName' and 'name' fields
      const userName = parsedData.userName || parsedData.name
      const { email, password } = parsedData

      console.log('Parsed user data:', { userName, email, password })

      if (!userName || !email || !password) {
        console.error('Missing required fields')
        return callback(null, {
          error: JSON.stringify(new InternalError('Missing required fields: userName, email, password')),
        })
      }

      const salt = encrypter.generateRandomKey()
      const encryptedPassword = await encrypter.encrypt({ password, salt })

      const createdUser = await userRepository.create({
        userName,
        email,
        passwordHash: encryptedPassword,
        passwordSalt: salt,
      })

      console.log('User created successfully:', createdUser.id)

      return callback(null, {
        payload: JSON.stringify({
          id: createdUser.id,
          userName: createdUser.userName,
          email: createdUser.email,
          createdAt: createdUser.createdAt,
          updatedAt: createdUser.updatedAt,
        }),
      })
    } catch (error) {
      console.error('createUser error:', error.message, error.stack)
      if (error.name === 'SequelizeUniqueConstraintError') {
        return callback(null, {
          error: JSON.stringify(new UserAlreadyExists('User already exists')),
        })
      }

      return callback(null, {
        error: JSON.stringify(new InternalError('Internal error')),
      })
    }
  }
}
