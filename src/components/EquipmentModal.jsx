import React, { useEffect, useRef, useState } from 'react'
import './EquipmentModal.css'

// Fonction pour obtenir l'icône en fonction du type d'équipement
const getEquipmentIcon = (type) => {
    const typeL = type?.toLowerCase() || ''

    if (typeL.includes('ordinateur') || typeL.includes('laptop') || typeL.includes('pc')) {
        return '💻'
    } else if (typeL.includes('téléphone') || typeL.includes('mobile') || typeL.includes('phone')) {
        return '📱'
    } else if (typeL.includes('moniteur') || typeL.includes('écran') || typeL.includes('screen')) {
        return '🖥️'
    } else if (typeL.includes('périphérique') || typeL.includes('accessoire')) {
        return '🔌'
    } else if (typeL.includes('tablette') || typeL.includes('tablet') || typeL.includes('ipad')) {
        return '📲'
    } else if (typeL.includes('imprimante') || typeL.includes('printer')) {
        return '🖨️'
    } else if (typeL.includes('réseau') || typeL.includes('network') || typeL.includes('switch') || typeL.includes('routeur')) {
        return '🌐'
    } else if (typeL.includes('stockage') || typeL.includes('disque') || typeL.includes('storage')) {
        return '💾'
    } else {
        return '📦'
    }
}

function EquipmentModal({ equipment, onClose }) {
    const [isClosing, setIsClosing] = useState(false)
    const sheetRef = useRef(null)
    const startYRef = useRef(0)
    const currentYRef = useRef(0)
    const isDraggingRef = useRef(false)

    useEffect(() => {
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = ''
        }
    }, [])

    if (!equipment) return null

    const handleClose = () => {
        setIsClosing(true)
        setTimeout(() => {
            onClose()
        }, 300) // Match CSS animation duration
    }

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            handleClose()
        }
    }

    // Touch handlers for swipe-to-close
    const handleTouchStart = (e) => {
        const touch = e.touches[0]
        startYRef.current = touch.clientY
        currentYRef.current = touch.clientY
        isDraggingRef.current = true
    }

    const handleTouchMove = (e) => {
        if (!isDraggingRef.current) return

        const touch = e.touches[0]
        currentYRef.current = touch.clientY
        const deltaY = currentYRef.current - startYRef.current

        // Only allow dragging down
        if (deltaY > 0 && sheetRef.current) {
            sheetRef.current.style.transform = `translateY(${deltaY}px)`
            // Reduce opacity as we drag
            const opacity = Math.max(0.3, 1 - deltaY / 500)
            sheetRef.current.style.opacity = opacity
        }
    }

    const handleTouchEnd = () => {
        if (!isDraggingRef.current) return

        const deltaY = currentYRef.current - startYRef.current

        // If dragged down more than 100px, close the sheet
        if (deltaY > 100) {
            handleClose()
        } else {
            // Otherwise, snap back
            if (sheetRef.current) {
                sheetRef.current.style.transform = ''
                sheetRef.current.style.opacity = ''
            }
        }

        isDraggingRef.current = false
    }

    const icon = getEquipmentIcon(equipment.equipment_type)

    return (
        <div
            className={`equipment-bottom-sheet-overlay ${isClosing ? 'closing' : ''}`}
            onClick={handleBackdropClick}
        >
            <div
                ref={sheetRef}
                className={`equipment-bottom-sheet ${isClosing ? 'closing' : ''}`}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Drag Handle */}
                <div className="bottom-sheet-handle">
                    <div className="handle-bar"></div>
                </div>

                {/* Header */}
                <div className="equipment-detail-header">
                    <div className="equipment-detail-title">
                        <h2>
                            <span className="equipment-icon">{icon}</span>
                            {equipment.brand} {equipment.model}
                        </h2>
                        <p className="equipment-detail-subtitle">
                            {equipment.equipment_type} • {equipment.serial_number}
                        </p>
                    </div>
                    <button onClick={handleClose} className="equipment-detail-close">
                        ×
                    </button>
                </div>

                {/* Body */}
                <div className="equipment-detail-body">
                    {/* Informations principales */}
                    <div className="detail-section">
                        <h3>📋 Informations principales</h3>
                        <div className="detail-grid">
                            <div className="detail-item">
                                <div className="detail-label">Marque</div>
                                <div className="detail-value">{equipment.brand || '-'}</div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-label">Modèle</div>
                                <div className="detail-value">{equipment.model || '-'}</div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-label">Type</div>
                                <div className="detail-value">
                                    <span className="detail-badge info">{equipment.equipment_type || '-'}</span>
                                </div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-label">Numéro de série</div>
                                <div className="detail-value monospace">{equipment.serial_number || '-'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Attribution */}
                    <div className="detail-section">
                        <h3>👤 Attribution</h3>
                        <div className="detail-grid">
                            <div className="detail-item">
                                <div className="detail-label">Agent</div>
                                <div className="detail-value">{equipment.agent_name || '-'}</div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-label">Chemin organisationnel</div>
                                <div className="detail-value" style={{ fontSize: '0.85rem' }}>
                                    {equipment.org_path || '-'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Informations techniques */}
                    {(equipment.ip_address || equipment.mac_address || equipment.code) && (
                        <div className="detail-section">
                            <h3>🔧 Informations techniques</h3>
                            <div className="detail-grid">
                                {equipment.ip_address && (
                                    <div className="detail-item">
                                        <div className="detail-label">Adresse IP</div>
                                        <div className="detail-value monospace">{equipment.ip_address}</div>
                                    </div>
                                )}
                                {equipment.mac_address && (
                                    <div className="detail-item">
                                        <div className="detail-label">Adresse MAC</div>
                                        <div className="detail-value monospace">{equipment.mac_address}</div>
                                    </div>
                                )}
                                {equipment.code && (
                                    <div className="detail-item">
                                        <div className="detail-label">Code</div>
                                        <div className="detail-value monospace">{equipment.code}</div>
                                    </div>
                                )}
                                {equipment.internal_id && (
                                    <div className="detail-item">
                                        <div className="detail-label">ID Interne</div>
                                        <div className="detail-value monospace">{equipment.internal_id}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Gestion */}
                    <div className="detail-section">
                        <h3>📅 Gestion</h3>
                        <div className="detail-grid">
                            <div className="detail-item">
                                <div className="detail-label">Date d'acquisition</div>
                                <div className="detail-value">{equipment.acquisition_date || '-'}</div>
                            </div>
                            {equipment.extra_info && equipment.extra_info !== '""' && (
                                <div className="detail-item">
                                    <div className="detail-label">Info supplémentaire</div>
                                    <div className="detail-value">{equipment.extra_info}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Connexion */}
                    {equipment.connected_to && equipment.connected_to !== 'connecté à' && equipment.connected_to !== '""' && (
                        <div className="detail-section">
                            <div className="connection-info">
                                <div className="connection-info-icon">🔗</div>
                                <div className="connection-info-text">
                                    <strong>Connecté à un équipement</strong>
                                    <span>ID: {equipment.connected_to}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export { getEquipmentIcon }
export default EquipmentModal
