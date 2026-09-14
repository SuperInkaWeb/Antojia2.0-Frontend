import { useRef, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { ImagePlus, Loader2, Upload, X } from 'lucide-react'
import { uploadImage } from '../../utils/uploadImage.js'
import './LogoUploader.css'

export default function ImageUploader({ value, onUploaded, scope = 'restaurants/logos', label = 'Subir imagen' }) {
  const { getAccessTokenSilently } = useAuth0()
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(value || null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async file => {
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Selecciona una imagen JPG, PNG o WEBP')
    if (file.size > 5 * 1024 * 1024) return setError('La imagen no puede superar 5 MB')

    setError('')
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const url = await uploadImage(file, scope, getAccessTokenSilently)
      setPreview(url)
      onUploaded(url)
    } catch (uploadError) {
      setPreview(value || null)
      setError(uploadError.message)
    } finally {
      setUploading(false)
    }
  }

  return <div className="lup lup--md">
    <div
      className={`lup-zone ${uploading ? 'lup-zone--loading' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => !uploading && inputRef.current?.click()}
      onKeyDown={event => event.key === 'Enter' && !uploading && inputRef.current?.click()}
      onDragOver={event => event.preventDefault()}
      onDrop={event => { event.preventDefault(); handleFile(event.dataTransfer.files[0]) }}
    >
      {uploading ? <div className="lup-uploading"><Loader2 size={22} className="lup-spin"/><span>Subiendo...</span></div> : preview ? (
        <div className="lup-preview"><img src={preview} alt={label}/><div className="lup-overlay"><Upload size={18}/><span>Cambiar</span></div></div>
      ) : <div className="lup-empty"><ImagePlus size={28} strokeWidth={1.5}/><span>{label}</span><span className="lup-hint">Arrastra una foto o haz clic · máx. 5 MB</span></div>}
    </div>
    {error && <div className="lup-error"><X size={13}/>{error}</div>}
    <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={event => handleFile(event.target.files?.[0])}/>
  </div>
}
