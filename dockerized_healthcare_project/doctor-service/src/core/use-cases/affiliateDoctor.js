function affiliateDoctorFactory ({
  doctorRepository,
}) {
  return async function execute ({
    request,
  }, callback) {
    try {
      const {
        payload,
      } = request

      const params = JSON.parse(payload)

      const createdDoctor = await doctorRepository.create({
        params,
      })

      return callback(null, {
        id: createdDoctor.id,
        payload: JSON.stringify(createdDoctor),
      })
    } catch (error) {
      console.error('Error in affiliateDoctor:', error.message)
      return callback(null, {
        error: JSON.stringify({
          message: error.message || 'Failed to affiliate doctor',
          code: 'INTERNAL_ERROR'
        }),
      })
    }
  }
}

export default affiliateDoctorFactory
