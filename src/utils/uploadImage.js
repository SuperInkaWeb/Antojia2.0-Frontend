import { api } from '../config/api.js'

const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE

/** Request an authenticated, short-lived upload URL and upload directly to Storage. */
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
  const { signedUrl, publicUrl } = response.data.data

  const uploadResponse = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!uploadResponse.ok) {
    const error = await uploadResponse.json().catch(() => ({}))
    throw new Error(error.message || 'No se pudo subir la imagen')
  }

  return publicUrl
}
