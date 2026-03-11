export default function doctorControllerFactory ({ DoctorService }) {
  async function affiliate ({ body: params }) {
    try {
      const affiliatedDoctor = await DoctorService
        .affiliateDoctor({ payload: JSON.stringify(params) })

      return {
        body: JSON.parse(affiliatedDoctor.payload),
        statusCode: 201,
      }
    } catch (err) {
      return {
        statusCode: 500,
        body: {
          error: err.message || 'Failed to affiliate doctor',
        },
      }
    }
  }

  return {
    affiliate,
  }
}
