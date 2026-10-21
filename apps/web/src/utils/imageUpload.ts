import { api } from '../services/api'

// Downscale on-device before upload so the server stores a ~150-300 KB JPEG
// instead of the camera's 5-10 MB original.
export function resizeImageToDataUrl(file: File, maxWidth = 1200, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not supported')); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')) }
    img.src = url
  })
}

export async function uploadLocalImage(dataUrl: string, folder: 'guides' | 'avatars' | 'stops' = 'guides'): Promise<string> {
  const res = await api.post<{ fileUrl: string; key: string }>('/upload/local', { dataUrl, folder })
  return res.data.fileUrl
}

// Resize + upload in one step. Returns the stored URL.
export async function resizeAndUploadImage(file: File, folder: 'guides' | 'avatars' | 'stops' = 'guides'): Promise<string> {
  const dataUrl = await resizeImageToDataUrl(file)
  return uploadLocalImage(dataUrl, folder)
}
