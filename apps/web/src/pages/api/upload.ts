import type { NextApiRequest, NextApiResponse } from 'next'
import { Readable } from 'stream'

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '10mb',
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Convert Node.js IncomingMessage to a web Request so we can use .formData()
    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) headers.set(key, Array.isArray(value) ? value[0] : value)
    }

    const webRequest = new Request(`http://localhost${req.url}`, {
      method: req.method!,
      headers,
      body: Readable.toWeb(req) as ReadableStream,
      // @ts-ignore - duplex is required for streaming request bodies
      duplex: 'half',
    })

    const formData = await webRequest.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return res.status(400).json({ error: 'No file provided' })
    }

    // Validate file type
    const validTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    const validExtensions = ['.csv', '.xlsx']
    const hasValidType = validTypes.includes(file.type)
    const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))

    if (!hasValidType && !hasValidExtension) {
      return res.status(400).json({ error: 'Invalid file type. Only CSV and XLSX files are supported.' })
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return res.status(400).json({ error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit.` })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const uniqueFileName = `${timestamp}-${file.name}`

    // Return the base64 content as a data URL for the parse step
    const fileType = file.type || (file.name.endsWith('.csv') ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    const url = `data:${fileType};base64,${base64}`

    return res.status(200).json({
      url,
      fileName: uniqueFileName,
      size: buffer.length,
      success: true,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return res.status(500).json({ error: 'Failed to upload file' })
  }
}
