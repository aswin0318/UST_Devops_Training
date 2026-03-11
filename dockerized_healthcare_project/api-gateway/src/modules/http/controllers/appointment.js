export default function appointmentControllerFactory ({ AppointmentService }) {
  async function create ({ params, body }) {
    try {
      const { id: doctorId } = params

      const createdAppointment = await AppointmentService.createAppointment({
        payload: JSON.stringify({
          doctorId,
          ...body,
        }),
      })

      return {
        body: JSON.parse(createdAppointment.payload),
        statusCode: 201,
      }
    } catch (err) {
      return {
        statusCode: 500,
        body: {
          error: err.message || 'Failed to create appointment',
        },
      }
    }
  }

  async function list ({ params, query }) {
    try {
      const { id: doctorId } = params

      const { appointments } = await AppointmentService.findAllAppointments({
        params: JSON.stringify({
          doctorId,
          ...query,
        }),
      })

      return {
        body: appointments.map(({ payload }) => ({ ...JSON.parse(payload) })),
        statusCode: 200,
      }
    } catch (err) {
      return {
        statusCode: 500,
        body: {
          error: err.message || 'Failed to list appointments',
        },
      }
    }
  }

  async function findAvailable ({ params, query }) {
    try {
      const { id: doctorId } = params

      const { appointments } = await AppointmentService.findAvailableAppointments({
        params: JSON.stringify({
          doctorId,
          ...query,
        }),
      })

      return {
        body: appointments.map(({ payload }) => ({ ...JSON.parse(payload) })),
        statusCode: 200,
      }
    } catch (err) {
      return {
        statusCode: 500,
        body: {
          error: err.message || 'Failed to find available appointments',
        },
      }
    }
  }

  return {
    create,
    list,
    findAvailable,
  }
}
