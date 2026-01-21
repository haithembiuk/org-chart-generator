import { createNextApiHandler } from '@trpc/server/adapters/next'
import { appRouter } from '../../../../../api/src/server/trpc'

export default createNextApiHandler({
  router: appRouter,
  createContext: () => ({}),
})