import { createNextApiHandler } from '@trpc/server/adapters/next'
import { appRouter } from '../../../../../api/src/server/trpc'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default createNextApiHandler({
  router: appRouter,
  createContext: () => ({}),
})