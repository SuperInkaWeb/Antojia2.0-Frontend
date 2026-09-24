import { api } from '../config/api.js'

const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE

/** Request a short-lived Cloudinary signature and upload directly to Cloudinary. */
export async function uploadImage(file, scope, getAccessTokenSilently) {
  const token = await getAccessTokenSilently({
    authorizationParams: { audience: AUTH0_AUDIENCE },
  })
  const response = await api.post('/api/v1/uploads/signed-url', {
    scope,
    contentType: file.type,
  }, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const { uploadUrl, apiKey, timestamp, signature, folder, publicId } = response.data.data

  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', apiKey)
  formData.append('timestamp', String(timestamp))
  formData.append('signature', signature)
  formData.append('folder', folder)
  formData.append('public_id', publicId)

  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  })
  if (!uploadResponse.ok) {
    const error = await uploadResponse.json().catch(() => ({}))
    throw new Error(error.error?.message || error.message || 'No se pudo subir la imagen')
  }

  const result = await uploadResponse.json()
  return result.secure_url || result.url
}
