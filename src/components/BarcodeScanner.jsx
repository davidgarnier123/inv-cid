import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import * as zbarWasm from '@undecaf/zbar-wasm'
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
  const [validationLevel, setValidationLevel] = useState(0)
  const [usingNative, setUsingNative] = useState(false)
  const [forceZbar, setForceZbar] = useState(false)

  const lastScannedCodeRef = useRef(null)

  const validationStateRef = useRef({
    currentCode: null,
    detectionCount: 0,
    firstDetectionTime: null,
    validationTimeout: null
  })

  const VALIDATION_WINDOW = 800

  const vibrate = (pattern = [100]) => {
    if (!vibrationEnabled) return
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern)
      } catch (e) {
        console.log('Vibration non supportée ou erreur:', e)
      }
    }
  }

  useEffect(() => {
    return () => {
      stopScanning()
    }
  }, [])

  const stopScanning = async () => {
    const validation = validationStateRef.current
    if (validation.validationTimeout) {
      clearTimeout(validation.validationTimeout)
      validation.validationTimeout = null
    }
    validation.currentCode = null
    validation.detectionCount = 0
    validation.firstDetectionTime = null
    setValidationLevel(0)

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsScanning(false)
    setDebugInfo('')
  }

  const handleCodeDetected = (code, format = 'unknown') => {
    const now = Date.now()
    const validation = validationStateRef.current

    if (code !== validation.currentCode) {
      validation.currentCode = code
      validation.detectionCount = 1
      validation.firstDetectionTime = now

      if (validation.validationTimeout) {
        clearTimeout(validation.validationTimeout)
      }

      setValidationLevel(1)
      vibrate([50])
      setDebugInfo(`Détection: ${code} (${validation.detectionCount}/${requiredDetections})...`)
    } else {
      validation.detectionCount++
      setValidationLevel(validation.detectionCount)
      vibrate([50])

      if (validation.detectionCount >= requiredDetections) {
        const timeSinceFirst = now - validation.firstDetectionTime

        if (timeSinceFirst <= VALIDATION_WINDOW) {
          if (code !== lastScannedCodeRef.current) {
            lastScannedCodeRef.current = code
            console.log('Code validé:', code, 'Format:', format)
            setValidationLevel(4)
            vibrate([200, 100, 200, 100, 200])
            setDebugInfo(`✓ Code validé: ${code} (${format})`)
            onScan(code)

            setTimeout(() => {
              lastScannedCodeRef.current = null
              setValidationLevel(0)
              setDebugInfo(`Recherche... (${usingNative ? 'Native' : 'ZBar'})`)
            }, 1500)
          }

          validation.currentCode = null
          validation.detectionCount = 0
          validation.firstDetectionTime = null

          if (validation.validationTimeout) {
            clearTimeout(validation.validationTimeout)
            validation.validationTimeout = null
          }
        } else {
          validation.currentCode = code
          validation.detectionCount = 1
          validation.firstDetectionTime = now
          setValidationLevel(1)
          setDebugInfo(`Détection: ${code} (${validation.detectionCount}/${requiredDetections})...`)
        }
      } else {
        setDebugInfo(`Détection: ${code} (${validation.detectionCount}/${requiredDetections})...`)

        if (validation.detectionCount === 1 && !validation.validationTimeout) {
          validation.validationTimeout = setTimeout(() => {
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

    if (!video || !canvas || !streamRef.current) {
      return
    }

    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    try {
      if (usingNative && nativeDetectorRef.current && !forceZbar) {
        const barcodes = await nativeDetectorRef.current.detect(video)

        if (barcodes.length > 0) {
          const barcode = barcodes[0]
          handleCodeDetected(barcode.rawValue, barcode.format)

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
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const results = await zbarWasm.scanImageData(imageData)

        if (results.length > 0) {
          const result = results[0]
          const decoded = result.decode()
          handleCodeDetected(decoded, result.typeName)

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
      // Ignore scanning errors
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame)
  }

  const startScanning = async () => {
    try {
      setError(null)
      setDebugInfo('Initialisation de la caméra...')

      let nativeAvailable = false
      console.log('🔍 Mode sélectionné:', forceZbar ? 'ZBar (forcé)' : 'Auto (Native si disponible)')

      if ('BarcodeDetector' in window && !forceZbar) {
        try {
          const formats = await window.BarcodeDetector.getSupportedFormats()
          console.log('📋 Native BarcodeDetector formats supportés:', formats)

          if (formats.includes('code_128') || formats.includes('code_39')) {
            nativeDetectorRef.current = new window.BarcodeDetector({
              formats: ['code_128', 'code_39']
            })
            setUsingNative(true)
            nativeAvailable = true
            console.log('✅ Utilisation de Native BarcodeDetector')
          } else {
            console.log('⚠️ Native BarcodeDetector ne supporte pas Code 128/39')
          }
        } catch (e) {
          console.warn('❌ Native BarcodeDetector non disponible:', e)
        }
      } else if (forceZbar) {
        console.log('🔧 Mode ZBar forcé par utilisateur')
      } else {
        console.log('❌ API BarcodeDetector non disponible dans ce navigateur')
      }

      if (!nativeAvailable) {
        setUsingNative(false)
        nativeDetectorRef.current = null
        console.log('🔧 Utilisation de ZBar WASM (fallback)')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          advanced: [{ focusMode: "continuous" }, { focusMode: "macro" }]
        }
      })

      streamRef.current = stream

      const video = videoRef.current
      const canvas = canvasRef.current

      if (!video || !canvas) {
        throw new Error('Video or canvas element not found')
      }

      video.srcObject = stream
      await video.play()

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      setIsScanning(true)
      setDebugInfo(`Scan actif... (${nativeAvailable ? 'Native' : 'ZBar'})`)

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
    const newForceZbar = !forceZbar
    setForceZbar(newForceZbar)

    if (!newForceZbar) {
      nativeDetectorRef.current = null
      setUsingNative(false)
    }

    if (isScanning) {
      stopScanning().then(() => {
        setTimeout(() => startScanning(), 150)
      })
    }
  }

  useImperativeHandle(ref, () => ({
    stopScanning: stopScanning
  }))

  useEffect(() => {
    if (enabled && !isScanning) {
      startScanning()
    } else if (!enabled && isScanning) {
      stopScanning()
    }
  }, [enabled])

  return (
    <div className="scanner-container">
      <div className="scanner-layout">
        <div className="scanner-header-compact">
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
              className={`engine-mode-badge ${forceZbar ? 'zbar-mode' : 'auto-mode'}`}
              title="Cliquer pour changer de moteur de détection"
            >
              {forceZbar ? (
                <><span className="mode-icon">🔧</span> ZBar</>
              ) : (
                <><span className="mode-icon">⚡</span> Auto</>
              )}
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
            <div className={`engine-status-badge ${usingNative && !forceZbar ? 'native-active' : 'zbar-active'}`}>
              {forceZbar ? (
                <><span className="status-icon">🔧</span> Mode ZBar (forcé)</>
              ) : usingNative ? (
                <><span className="status-icon">⚡</span> Mode Native (rapide)</>
              ) : (
                <><span className="status-icon">🔧</span> Mode ZBar (fallback)</>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

export default BarcodeScanner
