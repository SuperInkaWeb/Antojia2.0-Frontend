import { useState, useRef } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { Upload, Loader2, X, ImagePlus } from 'lucide-react'
import { uploadImage } from '../../utils/uploadImage.js'
import './LogoUploader.css'

/**
 * Props:
 *   currentUrl    — URL actual del logo (o null)
 *   onUploaded    — (url: string) => void
 *   size          — 'sm' | 'md'
 */
export default function LogoUploader({ currentUrl, onUploaded, size = 'md' }) {
  const { getAccessTokenSilently } = useAuth0()
  const [preview,   setPreview]   = useState(currentUrl || null)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState(null)
  const inputRef = useRef()

  const handleFile = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes (JPG, PNG, WEBP)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar 5 MB')
      return
    }

    setError(null)
    setPreview(URL.createObjectURL(file))  // preview local inmediato
    setUploading(true)

    try {
      const url = await uploadImage(file, 'restaurants/logos', getAccessTokenSilently)
      setPreview(url)
      onUploaded(url)
    } catch (err) {
      setError(err.message || 'No se pudo subir la imagen')
      setPreview(currentUrl || null)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className={`lup lup--${size}`}>
      <div
        className={`lup-zone ${uploading ? 'lup-zone--loading' : ''}`}
        onClick={() => !uploading && inputRef.current.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        role="button" tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && !uploading && inputRef.current.click()}
      >
        {/* Preview */}
        {preview && !uploading && (
          <div className="lup-preview">
            <img src={preview} alt="Logo del restaurante"/>
            <div className="lup-overlay">
              <Upload size={18}/>
              <span>Cambiar</span>
            </div>
          </div>
        )}

        {/* Estado vacío */}
        {!preview && !uploading && (
          <div className="lup-empty">
            <ImagePlus size={size === 'sm' ? 20 : 28} strokeWidth={1.5}/>
            <span>Subir logo</span>
            <span className="lup-hint">PNG · JPG · WEBP · máx 5 MB</span>
          </div>
        )}

        {/* Cargando */}
        {uploading && (
          <div className="lup-uploading">
            <Loader2 size={22} className="lup-spin"/>
            <span>Subiendo...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="lup-error">
          <X size={13}/> {error}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])}
      />
    </div>
  )
}
