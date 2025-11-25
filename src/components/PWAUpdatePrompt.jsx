import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './PWAUpdatePrompt.css'

function PWAUpdatePrompt() {
    const [showPrompt, setShowPrompt] = useState(false)

    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered:', r)
            // Vérifier les mises à jour toutes les heures
            r && setInterval(() => {
                r.update()
            }, 60 * 60 * 1000) // 1 heure
        },
        onRegisterError(error) {
            console.log('SW registration error', error)
        },
    })

    useEffect(() => {
        if (needRefresh) {
            setShowPrompt(true)
        }
    }, [needRefresh])

    const close = () => {
        setOfflineReady(false)
        setNeedRefresh(false)
        setShowPrompt(false)
    }

    const update = () => {
        updateServiceWorker(true)
    }

    if (!showPrompt && !offlineReady && !needRefresh) {
        return null
    }

    return (
        <div className="pwa-toast" role="alert">
            <div className="pwa-message">
                {offlineReady ? (
                    <span>✓ Application prête pour une utilisation hors ligne</span>
                ) : (
                    <span>🔄 Nouvelle version disponible</span>
                )}
            </div>
            <div className="pwa-buttons">
                {needRefresh && (
                    <button className="pwa-btn pwa-btn-primary" onClick={update}>
                        Mettre à jour
                    </button>
                )}
                <button className="pwa-btn pwa-btn-secondary" onClick={close}>
                    {needRefresh ? 'Plus tard' : 'OK'}
                </button>
            </div>
        </div>
    )
}

export default PWAUpdatePrompt
