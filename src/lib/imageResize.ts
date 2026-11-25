/**
 * Center-crops and resizes an uploaded image File to a square JPEG data URL
 * (default 160x160 at 0.8 quality) for fast Google Drive JSON syncing.
 */
export function resizeImageToAvatarDataUrl(
  file: File,
  size = 160,
): Promise<string> {
  if (!file.type || !file.type.startsWith('image/')) {
    return Promise.reject(new Error('Please select a valid image file.'))
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width
        const height = img.naturalHeight || img.height
        const side = Math.min(width, height)

        if (side <= 0) {
          URL.revokeObjectURL(objectUrl)
          reject(new Error('Selected image has invalid dimensions.'))
          return
        }

        const sx = Math.floor((width - side) / 2)
        const sy = Math.floor((height - side) / 2)

        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(objectUrl)
          reject(new Error('Canvas context unavailable for image resize.'))
          return
        }

        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        URL.revokeObjectURL(objectUrl)
        resolve(dataUrl)
      } catch (err) {
        URL.revokeObjectURL(objectUrl)
        reject(
          err instanceof Error
            ? err
            : new Error('Failed to process selected image.'),
        )
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not decode the selected image file.'))
    }

    img.src = objectUrl
  })
}
