import { describe, it, expect, vi, beforeEach } from 'vitest'
import { appRouter } from './trpc'
import { put } from '@vercel/blob'

// Mock @vercel/blob
vi.mock('@vercel/blob', () => ({
  put: vi.fn()
}))

const mockPut = vi.mocked(put)

describe('uploadFile tRPC procedure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should upload a valid CSV file', async () => {
    const mockBlob = {
      url: 'https://example.blob.vercel-storage.com/test-file.csv',
      downloadUrl: 'https://example.blob.vercel-storage.com/test-file.csv',
      pathname: 'test-file.csv',
      contentType: 'text/csv',
      contentDisposition: 'attachment; filename="test-file.csv"'
    }
    
    mockPut.mockResolvedValue(mockBlob)

    const caller = appRouter.createCaller({})
    const fileContent = Buffer.from('name,age\nJohn,30\nJane,25').toString('base64')

    const result = await caller.uploadFile({
      fileName: 'test.csv',
      fileType: 'text/csv',
      fileContent
    })

    expect(result.success).toBe(true)
    expect(result.url).toBe(mockBlob.url)
    expect(result.fileName).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-test\.csv/)
    expect(mockPut).toHaveBeenCalledWith(
      expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-test\.csv/),
      expect.any(Buffer),
      {
        access: 'public',
        contentType: 'text/csv'
      }
    )
  })

  it('should upload a valid XLSX file', async () => {
    const mockBlob = {
      url: 'https://example.blob.vercel-storage.com/test-file.xlsx',
      downloadUrl: 'https://example.blob.vercel-storage.com/test-file.xlsx',
      pathname: 'test-file.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contentDisposition: 'attachment; filename="test-file.xlsx"'
    }
    
    mockPut.mockResolvedValue(mockBlob)

    const caller = appRouter.createCaller({})
    const fileContent = Buffer.from('mock excel content').toString('base64')

    const result = await caller.uploadFile({
      fileName: 'test.xlsx',
      fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileContent
    })

    expect(result.success).toBe(true)
    expect(result.url).toBe(mockBlob.url)
    expect(result.fileName).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-test\.xlsx/)
  })

  it('should reject invalid file types', async () => {
    const caller = appRouter.createCaller({})
    const fileContent = Buffer.from('test content').toString('base64')

    await expect(caller.uploadFile({
      fileName: 'test.txt',
      fileType: 'text/plain',
      fileContent
    })).rejects.toThrow('Invalid file type. Only CSV and XLSX files are supported.')
  })

  it('should handle upload errors', async () => {
    mockPut.mockRejectedValue(new Error('Upload failed'))

    const caller = appRouter.createCaller({})
    const fileContent = Buffer.from('name,age\nJohn,30').toString('base64')

    await expect(caller.uploadFile({
      fileName: 'test.csv',
      fileType: 'text/csv',
      fileContent
    })).rejects.toThrow('Failed to upload file')
  })
})