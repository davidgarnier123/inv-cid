import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import * as zbarWasm from '@undecaf/zbar-wasm' // Namespace import to avoid bundler issues
import './BarcodeScanner.css'

const BarcodeScanner = forwardRef(function BarcodeScanner({ onScan, enabled = true, requiredDetections = 2, vibrationEnabled = true }, ref) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const nativeDetectorRef = useRef(null)
  const animationFrameRef = useRef(null)

  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState(null)
  const [debugInfo, setDebugInfo] = useState('')
  const [validationLevel, setValidationLevel] = useState(0) // 0 = aucune, 1-3 = progression, 4 = validé
  const [usingNative, setUsingNative] = useState(false)
  const [forceZbar, setForceZbar] = useState(false) // Debug toggle

  const lastScannedCodeRef = useRef(null)

  // Système de validation pour éviter les fausses détections
  const validationStateRef = useRef({
    currentCode: null,
    detectionCount: 0,
    firstDetectionTime: null,
    validationTimeout: null
  })

  const VALIDATION_WINDOW = 800 // Fenêtre de temps en ms pour valider

  // Fonction pour déclencher une vibration
  const vibrate = (pattern = [100]) => {
    if (!vibrationEnabled) return // Skip if vibration is disabled in settings
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern)
      } catch (e) {
        console.log('Vibration non supportée ou erreur:', e)
      }
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning()
    }
  }, [])

  const stopScanning = async () => {
    // Réinitialiser l'état de validation
    const validation = validationStateRef.current
    if (validation.validationTimeout) {
      clearTimeout(validation.validationTimeout)
      validation.validationTimeout = null
    }
    validation.currentCode = null
    validation.detectionCount = 0
    validation.firstDetectionTime = null
    setValidationLevel(0)

    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    // Clear video
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsScanning(false)
    setDebugInfo('')
  }

  const handleCodeDetected = (code, format = 'unknown') => {
    const now = Date.now()
    const validation = validationStateRef.current

    // Si c'est un nouveau code, réinitialiser la validation
    if (code !== validation.currentCode) {
      validation.currentCode = code
      validation.detectionCount = 1
      validation.firstDetectionTime = now

      // Annuler le timeout précédent s'il existe
      if (validation.validationTimeout) {
        clearTimeout(validation.validationTimeout)
      }

      setValidationLevel(1)
      vibrate([50]) // Vibration courte pour première détection
      setDebugInfo(`Détection: ${code} (${validation.detectionCount}/${requiredDetections})...`)
    } else {
      // Même code détecté à nouveau
      validation.detectionCount++
      setValidationLevel(validation.detectionCount)
      vibrate([50]) // Vibration pour chaque détection

      // Vérifier si on a assez de détections
      if (validation.detectionCount >= requiredDetections) {
        // Vérifier que c'est dans la fenêtre de temps
        const timeSinceFirst = now - validation.firstDetectionTime

        if (timeSinceFirst <= VALIDATION_WINDOW) {
          // Code validé !
          if (code !== lastScannedCodeRef.current) {
            lastScannedCodeRef.current = code
            console.log('Code validé:', code, 'Format:', format)
            setValidationLevel(4) // Niveau validé (vert clair)
            vibrate([200, 100, 200, 100, 200]) // Vibration longue pour validation
            setDebugInfo(`✓ Code validé: ${code} (${format})`)
            onScan(code)

            // Réinitialiser après 1.5 secondes pour permettre un nouveau scan
            setTimeout(() => {
              lastScannedCodeRef.current = null
              setValidationLevel(0)
              setDebugInfo(`Recherche... (${usingNative ? 'Native' : 'ZBar'})`)
            }, 1500)
          }

          // Réinitialiser la validation
          validation.currentCode = null
          validation.detectionCount = 0
          validation.firstDetectionTime = null

          if (validation.validationTimeout) {
            clearTimeout(validation.validationTimeout)
            validation.validationTimeout = null
          }
        } else {
          // Trop de temps écoulé, réinitialiser
          validation.currentCode = code
          validation.detectionCount = 1
          validation.firstDetectionTime = now
          setValidationLevel(1)
          setDebugInfo(`Détection: ${code} (${validation.detectionCount}/${requiredDetections})...`)
        }
      } else {
        // Pas encore assez de détections
        setDebugInfo(`Détection: ${code} (${validation.detectionCount}/${requiredDetections})...`)

        // Si c'est la première détection, démarrer un timeout
        if (validation.detectionCount === 1 && !validation.validationTimeout) {
          validation.validationTimeout = setTimeout(() => {
            // Timeout : réinitialiser si pas assez de détections
            if (validation.detectionCount < requiredDetections) {
              validation.currentCode = null
              validation.detectionCount = 0
              validation.firstDetectionTime = null
              validation.validationTimeout = null
              setValidationLevel(0)
              setDebugInfo(`Recherche... (${usingNative ? 'Native' : 'ZBar'})`)
            }
          }, VALIDATION_WINDOW)
        }
      }
    }
  }

  const scanFrame = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas || !isScanning) {
      return
    }

    const ctx = canvas.getContext('2d')

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    try {
      if (usingNative && nativeDetectorRef.current && !forceZbar) {
        // --- STRATEGY A: NATIVE DETECTOR ---
        const barcodes = await nativeDetectorRef.current.detect(video)

        if (barcodes.length > 0) {
          const barcode = barcodes[0]
          handleCodeDetected(barcode.rawValue, barcode.format)

          // Draw bounding box
          if (barcode.boundingBox) {
            ctx.strokeStyle = '#00ff00'
            ctx.lineWidth = 3
            ctx.strokeRect(
              barcode.boundingBox.x,
              barcode.boundingBox.y,
              barcode.boundingBox.width,
              barcode.boundingBox.height
            )
          }
        }
      } else {
        // --- STRATEGY B: ZBAR WASM ---
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const results = await zbarWasm.scanImageData(imageData)

        if (results.length > 0) {
          const result = results[0]
          const decoded = result.decode()
          handleCodeDetected(decoded, result.typeName)

          // Draw bounding box from points
          if (result.points && result.points.length > 0) {
            ctx.strokeStyle = '#00ff00'
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.moveTo(result.points[0].x, result.points[0].y)
            for (let i = 1; i < result.points.length; i++) {
              ctx.lineTo(result.points[i].x, result.points[i].y)
            }
            ctx.closePath()
            ctx.stroke()
          }
        }
      }
    } catch (err) {
      // Ignore scanning errors, they're normal when no barcode is present
      // console.debug('Scan error:', err)
    }

    // Continue scanning
    animationFrameRef.current = requestAnimationFrame(scanFrame)
  }

  const startScanning = async () => {
    try {
      setError(null)
      setDebugInfo('Initialisation de la caméra...')

      // 1. Try to initialize Native Detector (unless forced to use ZBar)
      let nativeAvailable = false
      if ('BarcodeDetector' in window && !forceZbar) {
        try {
          const formats = await window.BarcodeDetector.getSupportedFormats()
          console.log('Native BarcodeDetector formats supportés:', formats)

          if (formats.includes('code_128') || formats.includes('code_39')) {
            nativeDetectorRef.current = new window.BarcodeDetector({
              formats: ['code_128', 'code_39']
            })
            setUsingNative(true)
            nativeAvailable = true
            console.log('✓ Utilisation de Native BarcodeDetector')
          }
        } catch (e) {
          console.warn('Native BarcodeDetector non disponible:', e)
        }
      }

      if (!nativeAvailable) {
        setUsingNative(false)
        console.log('✓ Utilisation de ZBar WASM (fallback)')
      }

      // 2. Get Camera Stream (1080p for better long-range detection)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })

      streamRef.current = stream

      // 3. Attach stream to video
      const video = videoRef.current
      const canvas = canvasRef.current

      if (!video || !canvas) {
        throw new Error('Video or canvas element not found')
      }

      video.srcObject = stream
      await video.play()

      // 4. Set canvas size to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      setIsScanning(true)
      setDebugInfo(`Scan actif... (${nativeAvailable ? 'Native' : 'ZBar'})`)

      // 5. Start scanning loop
      scanFrame()

    } catch (err) {
      console.error('Erreur lors du scan:', err)

      if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
        setError('Accès à la caméra refusé. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.')
      } else if (err.name === 'NotFoundError' || err.message?.includes('No camera')) {
        setError('Aucune caméra trouvée sur cet appareil.')
      } else if (err.message?.includes('getUserMedia')) {
        setError('Impossible d\'accéder à la caméra. Vérifiez les permissions et que vous êtes en HTTPS.')
      } else {
        setError(`Erreur: ${err.message || 'Impossible de démarrer le scanner'}`)
      }

      setIsScanning(false)
      setDebugInfo('')
    }
  }

  const handleToggleScan = () => {
    if (!enabled) return
    if (isScanning) {
      stopScanning()
    } else {
      startScanning()
    }
  }

  const handleToggleEngine = () => {
    setForceZbar(!forceZbar)
    if (isScanning) {
      // Restart scanning with new engine
      stopScanning().then(() => {
        setTimeout(() => startScanning(), 100)
      })
    }
  }

  // Exposer la méthode stopScanning via ref
  useImperativeHandle(ref, () => ({
    stopScanning: stopScanning
  }))

  // Démarrer automatiquement le scan si enabled est true
  useEffect(() => {
    if (enabled && !isScanning) {
      startScanning()
    } else if (!enabled && isScanning) {
      stopScanning()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  return (
    <div className="scanner-container">
      <div className="scanner-layout">
        <div className="scanner-header-compact">
          <h2>Scanner de codes-barres</h2>
          <div className="header-controls">
            {enabled && (
              <button
                onClick={handleToggleScan}
                className={`scan-btn-compact ${isScanning ? 'scanning' : ''}`}
                title={isScanning ? 'Arrêter la session' : 'Démarrer la session'}
              >
                {isScanning ? '⏸️' : '▶️'}
              </button>
            )}
            <button
              onClick={handleToggleEngine}
              className="engine-toggle-btn"
              title={forceZbar ? 'Utiliser Native (si disponible)' : 'Forcer ZBar WASM'}
            >
              {forceZbar ? '🔧 ZBar' : '⚡ Auto'}
            </button>
          </div>
        </div>

        <div className="camera-center">
          {error && (
            <div className="error-message-compact">
              ⚠️ {error}
            </div>
          )}

          <div className="video-wrapper">
            <div className={`scanner-video-container validation-level-${validationLevel}`}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: isScanning ? 'block' : 'none'
                }}
              />
              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: isScanning ? 'block' : 'none'
                }}
              />
              {!isScanning && (
                <div className="video-placeholder">
                  <p>📷 Appuyez sur ▶️ pour activer la caméra</p>
                </div>
              )}
            </div>
            {isScanning && validationLevel > 0 && (
              <div className={`validation-indicator validation-level-${validationLevel}`}>
                <div className="validation-progress">
                  <div className="validation-bar" style={{ width: `${(validationLevel / requiredDetections) * 100}%` }}></div>
                </div>
              </div>
            )}
          </div>

          {debugInfo && isScanning && (
            <div className="debug-info-compact">
              {debugInfo}
            </div>
          )}

          {isScanning && (
            <div className="engine-indicator">
              {forceZbar ? '🔧 ZBar WASM (forcé)' : (usingNative ? '⚡ Native BarcodeDetector' : '🔧 ZBar WASM')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

export default BarcodeScanner
