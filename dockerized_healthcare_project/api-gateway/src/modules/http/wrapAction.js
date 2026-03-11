import { forEach, toPairs } from 'ramda'

function wrapAction (action) {
  return async function execute (req, res, next) {
    try {
      const response = await action(req)

      if (!response) {
        return res.status(500).json({ error: 'No response from action' })
      }

      if (!response.statusCode) {
        return res.status(500).json({ error: 'Missing statusCode in response' })
      }

      const {
        statusCode,
        body = {},
      } = response

      if (response.headers) {
        forEach(([key, value]) => {
          res.set(key, value)
        }, toPairs(response.headers))
      }

      res.status(statusCode).json(body)
    } catch (error) {
      console.error('Action error:', error.message, error.stack)
      next(error)
    }
  }
}

export default wrapAction
