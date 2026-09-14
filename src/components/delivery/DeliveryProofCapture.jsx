import { useRef, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { Camera, CheckCircle2, Loader2 } from 'lucide-react'
import { uploadImage } from '../../utils/uploadImage.js'

export default function DeliveryProofCapture({ value, onUploaded }) {
  const { getAccessTokenSilently } = useAuth0()
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const handlePhoto = async (file) => {
    if (!file) return
    setUploading(true); setError('')
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error('La fotografía no puede superar 8 MB')
      onUploaded(await uploadImage(file, 'delivery/proofs', getAccessTokenSilently))
    }
    catch (err) { setError(err.message); onUploaded('') }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = '' }
  }
  return <div className="ddash-proof-capture">
    <button type="button" className="ddash-camera" disabled={uploading} onClick={() => inputRef.current?.click()}>
      {uploading ? <Loader2 size={17} className="ddash-spinner"/> : value ? <CheckCircle2 size={17}/> : <Camera size={17}/>}
      {uploading ? 'Subiendo foto…' : value ? 'Foto subida · volver a tomar' : 'Tomar foto de entrega'}
    </button>
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={e => handlePhoto(e.target.files?.[0])}/>
    {value && <img className="ddash-proof-preview" src={value} alt="Comprobante de entrega"/>}
    {error && <small className="ddash-proof-error">{error}</small>}
  </div>
}
