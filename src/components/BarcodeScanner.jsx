import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import './BarcodeScanner.css'

const BarcodeScanner = forwardRef(function BarcodeScanner({ onScan, enabled = true }, ref) {
  const scannerId = 'html5qr-code-full-region'
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState(null)
  const [debugInfo, setDebugInfo] = useState('')
  const [validationLevel, setValidationLevel] = useState(0) // 0 = aucune, 1-3 = progression, 4 = validé
  const lastScannedCodeRef = useRef(null)
  const html5QrCodeRef = useRef(null)
  
  // Système de validation pour éviter les fausses détections
  const validationStateRef = useRef({
    currentCode: null,
    detectionCount: 0,
    firstDetectionTime: null,
    validationTimeout: null
  })
  
  const REQUIRED_DETECTIONS = 3 // Nombre de détections consécutives requises
  const VALIDATION_WINDOW = 800 // Fenêtre de temps en ms pour valider

  // Fonction pour déclencher une vibration
  const vibrate = (pattern = [100]) => {
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
    
    if (html5QrCodeRef.current) {
      try {
        if (isScanning) {
          await html5QrCodeRef.current.stop()
        }
        await html5QrCodeRef.current.clear()
      } catch (err) {
        console.log('Erreur lors de l\'arrêt du scanner:', err)
      }
      html5QrCodeRef.current = null
    }
    setIsScanning(false)
    setDebugInfo('')
  }

  const startScanning = async () => {
    try {
      setError(null)
      setDebugInfo('Initialisation de la caméra...')

      // Créer une instance Html5Qrcode
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerId)
      }

      const html5QrCode = html5QrCodeRef.current

      // Configurationgit pour les codes-barres français (EAN-13, EAN-8, etc.)
      // Calculer la taille optimale de la zone de scan pour détecter les petits codes-barres
      const getOptimalScanBox = () => {
        // Utiliser une zone plus grande pour mieux détecter les petits codes-barres
        // On utilise une fonction pour calculer dynamiquement
        const viewportWidth = window.innerWidth || 640
        const viewportHeight = window.innerHeight || 480
        
        // Zone de scan plus grande : jusqu'à 90% de la largeur pour mieux capturer les petits codes
        // Pour les codes-barres linéaires, on privilégie une zone large
        const maxWidth = Math.min(viewportWidth * 0.9, 600)
        const maxHeight = Math.min(viewportHeight * 0.5, 300)
        
        return {
          width: Math.max(400, maxWidth),
          height: Math.max(180, maxHeight)
        }
      }

      const scanBox = getOptimalScanBox()

      const config = {
        fps: 10, // Frames par seconde augmentées pour meilleure détection
        qrbox: scanBox, // Zone de scan optimisée pour petits codes-barres
        aspectRatio: 1.0,
        // Formats supportés - focus sur les codes-barres linéaires
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.RSS_14,
          Html5QrcodeSupportedFormats.RSS_EXPANDED,
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        // Utiliser la caméra arrière sur mobile avec meilleure résolution
        videoConstraints: {
          facingMode: 'environment',
          // Demander une résolution plus élevée pour mieux voir les petits codes
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      }

      setIsScanning(true)
      setDebugInfo('Caméra activée. Recherche de codes-barres...')

      // Démarrer le scan
      await html5QrCode.start(
        { facingMode: 'environment' }, // Caméra arrière
        config,
        (decodedText, decodedResult) => {
          // Code détecté avec succès
          const code = decodedText
          const format = decodedResult.result.format?.formatName || 'inconnu'
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
            setDebugInfo(`Détection: ${code} (${validation.detectionCount}/${REQUIRED_DETECTIONS})...`)
          } else {
            // Même code détecté à nouveau
            validation.detectionCount++
            setValidationLevel(validation.detectionCount)
            vibrate([50]) // Vibration pour chaque détection
            
            // Vérifier si on a assez de détections
            if (validation.detectionCount >= REQUIRED_DETECTIONS) {
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
                    setDebugInfo('Recherche de codes-barres...')
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
                setDebugInfo(`Détection: ${code} (${validation.detectionCount}/${REQUIRED_DETECTIONS})...`)
              }
            } else {
              // Pas encore assez de détections
              setDebugInfo(`Détection: ${code} (${validation.detectionCount}/${REQUIRED_DETECTIONS})...`)
              
              // Si c'est la première détection, démarrer un timeout
              if (validation.detectionCount === 1 && !validation.validationTimeout) {
                validation.validationTimeout = setTimeout(() => {
                  // Timeout : réinitialiser si pas assez de détections
                  if (validation.detectionCount < REQUIRED_DETECTIONS) {
                    validation.currentCode = null
                    validation.detectionCount = 0
                    validation.firstDetectionTime = null
                    validation.validationTimeout = null
                    setValidationLevel(0)
                    setDebugInfo('Recherche de codes-barres...')
                  }
                }, VALIDATION_WINDOW)
              }
            }
          }
        },
        (errorMessage) => {
          // Erreurs de scan (normal quand aucun code n'est détecté)
          // On ignore les erreurs "NotFoundException" qui sont normales
          if (!errorMessage.includes('No QR code') && 
              !errorMessage.includes('NotFoundException') &&
              !errorMessage.includes('No MultiFormat Readers')) {
            console.debug('Scan en cours...', errorMessage)
          }
        }
      )

      setDebugInfo('Scan actif. Pointez vers un code-barres...')

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
      html5QrCodeRef.current = null
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
          {enabled && (
            <button 
              onClick={handleToggleScan} 
              className={`scan-btn-compact ${isScanning ? 'scanning' : ''}`}
              title={isScanning ? 'Arrêter la session' : 'Démarrer la session'}
            >
              {isScanning ? '⏸️' : '▶️'}
            </button>
          )}
        </div>

        <div className="camera-center">
          {error && (
            <div className="error-message-compact">
              ⚠️ {error}
            </div>
          )}

          <div className="video-wrapper">
            <div 
              id={scannerId}
              style={{ width: '100%', height: '100%' }}
              className={`scanner-video-container validation-level-${validationLevel}`}
            />
            {!isScanning && (
              <div className="video-placeholder">
                <p>📷 Appuyez sur ▶️ pour activer la caméra</p>
              </div>
            )}
            {isScanning && validationLevel > 0 && (
              <div className={`validation-indicator validation-level-${validationLevel}`}>
                <div className="validation-progress">
                  <div className="validation-bar" style={{ width: `${(validationLevel / REQUIRED_DETECTIONS) * 100}%` }}></div>
                </div>
              </div>
            )}
          </div>

          {debugInfo && isScanning && (
            <div className="debug-info-compact">
              {debugInfo}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

export default BarcodeScanner
