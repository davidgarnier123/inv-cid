import React, { useState } from 'react'
import { getEquipmentIcon } from './EquipmentModal'
import './DatabaseSearch.css'

function DatabaseSearch({ equipmentDatabase, onEquipmentClick }) {
    const [searchTerm, setSearchTerm] = useState('')

    const filteredDatabase = equipmentDatabase.filter(item => {
        if (!searchTerm) return true
        const search = searchTerm.toLowerCase()
        return (
            item.barcode_id?.toLowerCase().includes(search) ||
            item.serial_number?.toLowerCase().includes(search) ||
            item.brand?.toLowerCase().includes(search) ||
            item.model?.toLowerCase().includes(search) ||
            item.agent_name?.toLowerCase().includes(search) ||
            item.equipment_type?.toLowerCase().includes(search)
        )
    })

    const displayedItems = filteredDatabase.slice(0, 100)

    return (
        <div className="database-search-page">
            <div className="search-header">
                <h1>🔍 Recherche</h1>
                <p className="search-subtitle">
                    {equipmentDatabase.length} équipements dans la base
                </p>
            </div>

            <div className="search-bar-container">
                <input
                    type="text"
                    placeholder="🔍 ID, marque, modèle, agent, type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-bar"
                    autoFocus
                />
                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm('')}
                        className="clear-search-btn"
                        aria-label="Effacer la recherche"
                    >
                        ×
                    </button>
                )}
            </div>

            <div className="results-count">
                {searchTerm ? (
                    <span>{filteredDatabase.length} résultat(s) trouvé(s)</span>
                ) : (
                    <span>Tous les équipements</span>
                )}
            </div>

            {equipmentDatabase.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📦</div>
                    <h3>Aucun équipement</h3>
                    <p>Allez dans Paramètres pour importer votre base de données CSV</p>
                </div>
            ) : filteredDatabase.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🔍</div>
                    <h3>Aucun résultat</h3>
                    <p>Aucun équipement ne correspond à "{searchTerm}"</p>
                </div>
            ) : (
                <div className="equipment-grid">
                    {displayedItems.map((item, index) => {
                        const icon = getEquipmentIcon(item.equipment_type)
                        return (
                            <div
                                key={index}
                                className="equipment-card"
                                onClick={() => onEquipmentClick && onEquipmentClick(item)}
                            >
                                <div className="equipment-card-header">
                                    <span className="equipment-card-icon">{icon}</span>
                                    <span className="equipment-card-id">{item.barcode_id}</span>
                                </div>
                                <div className="equipment-card-body">
                                    <h3 className="equipment-card-title">
                                        {item.brand} {item.model}
                                    </h3>
                                    <p className="equipment-card-type">{item.equipment_type}</p>
                                    {item.agent_name && (
                                        <p className="equipment-card-agent">
                                            👤 {item.agent_name}
                                        </p>
                                    )}
                                </div>
                                <div className="equipment-card-footer">
                                    {/* <span className="tap-hint">Appuyer pour détails</span> */}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {filteredDatabase.length > 100 && (
                <div className="load-more-notice">
                    Affichage de 100 résultats sur {filteredDatabase.length}.
                    Affinez votre recherche pour voir plus.
                </div>
            )}
        </div>
    )
}

export default DatabaseSearch
