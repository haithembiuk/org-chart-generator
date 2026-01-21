export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          API Server
        </h1>
        <p className="text-gray-600">
          Organization Chart Generator API is running!
        </p>
        <p className="text-sm text-gray-500 mt-4">
          tRPC endpoint available at: /api/trpc
        </p>
      </div>
    </div>
  )
}