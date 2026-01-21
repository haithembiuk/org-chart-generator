export const config = {
  app: {
    name: 'Organization Chart Generator',
    version: '1.0.0',
  },
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  auth: {
    secret: process.env.NEXTAUTH_SECRET || 'development-secret',
    url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },
}