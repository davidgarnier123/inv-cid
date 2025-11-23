import { useState, useEffect } from 'react'
import './SettingsPage.css'

function SettingsPage({
    equipmentDatabase,
    setEquipmentDatabase,
    scannerSettings,
    setScannerSettings
}) {
    const [databaseMeta, setDatabaseMeta] = useState(null)
    const [uploadStatus, setUploadStatus] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [isDragging, setIsDragging] = useState(false)

    // Load database metadata on mount
    useEffect(() => {
        const meta = localStorage.getItem('databaseMeta')
        if (meta) {
            setDatabaseMeta(JSON.parse(meta))
        }
    }, [equipmentDatabase])

    const parseCSV = (csvText) => {
        try {
            const lines = csvText.split('\n').filter(line => line.trim())
            if (lines.length < 2) {
                throw new Error('Le fichier CSV doit contenir au moins une ligne de données')
            }

            // Parse headers
            const headers = lines[0].split(',').map(h => h.trim())

            // Verify required columns
            if (!headers.includes('barcode_id')) {
                throw new Error('La colonne "barcode_id" est requise')
            }

            // Parse data
            const data = lines.slice(1).map((line, index) => {
                const values = line.split(',').map(v => v.trim())
                const obj = {}
                headers.forEach((header, i) => {
                    obj[header] = values[i] || ''
                })
                return obj
            }).filter(item => item.barcode_id) // Filter out empty rows

            return data
        } catch (error) {
            throw new Error(`Erreur de parsing: ${error.message}`)
        }
    }

    const handleFileUpload = (file) => {
        if (!file) return

        if (!file.name.endsWith('.csv')) {
            setUploadStatus({ type: 'error', message: 'Veuillez sélectionner un fichier CSV' })
            return
        }

        const reader = new FileReader()

        reader.onload = (e) => {
            try {
                const csvText = e.target.result
                const parsedData = parseCSV(csvText)

                // Save to state and localStorage
                setEquipmentDatabase(parsedData)
                localStorage.setItem('equipmentDatabase', JSON.stringify(parsedData))

                // Save metadata
                const meta = {
                    uploadDate: new Date().toISOString(),
                    totalItems: parsedData.length,
                    fileName: file.name
                }
                setDatabaseMeta(meta)
                localStorage.setItem('databaseMeta', JSON.stringify(meta))

                setUploadStatus({
                    type: 'success',
                    message: `✓ ${parsedData.length} équipements importés avec succès`
                })
            } catch (error) {
                setUploadStatus({ type: 'error', message: error.message })
            }
        }

        reader.onerror = () => {
            setUploadStatus({ type: 'error', message: 'Erreur lors de la lecture du fichier' })
        }

        reader.readAsText(file)
    }

    const handleFileInput = (e) => {
        const file = e.target.files[0]
        handleFileUpload(file)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        handleFileUpload(file)
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const clearDatabase = () => {
        if (confirm('Êtes-vous sûr de vouloir effacer toute la base de données ?')) {
            setEquipmentDatabase([])
            setDatabaseMeta(null)
            localStorage.removeItem('equipmentDatabase')
            localStorage.removeItem('databaseMeta')
            setUploadStatus({ type: 'success', message: '✓ Base de données effacée' })
        }
    }

    const downloadSampleCSV = () => {
        const sampleCSV = `barcode_id,equipment_name,equipment_type,agent_name,status,acquisition_date,notes
1234567,Laptop Dell XPS 15,Ordinateur,Jean Dupont,En service,2023-01-15,I7 16GB RAM
2345678,iPhone 13 Pro,Téléphone,Marie Martin,En service,2023-03-20,256GB
3456789,Écran Dell 27",Moniteur,Pierre Durand,En service,2023-02-10,4K UHD
4567890,Clavier mécanique,Périphérique,Sophie Bernard,En service,2023-04-05,Cherry MX Blue
5678901,Souris Logitech MX,Périphérique,Luc Moreau,En service,2023-05-12,Sans fil`

        const blob = new Blob([sampleCSV], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'sample_equipment.csv'
        a.click()
        URL.revokeObjectURL(url)
    }

    const updateScannerSetting = (key, value) => {
        const newSettings = { ...scannerSettings, [key]: value }
        setScannerSettings(newSettings)
        localStorage.setItem('scannerSettings', JSON.stringify(newSettings))
    }

    const filteredDatabase = equipmentDatabase.filter(item => {
        if (!searchTerm) return true
        const search = searchTerm.toLowerCase()
        return (
            item.barcode_id?.toLowerCase().includes(search) ||
            item.equipment_name?.toLowerCase().includes(search) ||
            item.agent_name?.toLowerCase().includes(search) ||
            item.equipment_type?.toLowerCase().includes(search)
        )
    })

    const displayedItems = filteredDatabase.slice(0, 10)

    // Get unique agents count
    const uniqueAgents = new Set(equipmentDatabase.map(item => item.agent_name).filter(Boolean)).size

    return (
        <div className="settings-page">
            <div className="settings-header">
                <h1>⚙️ Paramètres</h1>
            </div>

            {/* Database Section */}
            <section className="settings-section">
                <h2>📦 Base de données d'équipement</h2>

                <div
                    className={`upload-zone ${isDragging ? 'dragging' : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                    <div className="upload-icon">📁</div>
                    <p className="upload-text">Glisser-déposer un fichier CSV ou</p>
                    <label htmlFor="csv-file-input" className="upload-btn">
                        Choisir un fichier
                    </label>
                    <input
                        id="csv-file-input"
                        type="file"
                        accept=".csv"
                        onChange={handleFileInput}
                        style={{ display: 'none' }}
                    />
                    <p className="upload-hint">Format CSV requis avec colonne "barcode_id"</p>
                </div>

                {uploadStatus && (
                    <div className={`upload-status ${uploadStatus.type}`}>
                        {uploadStatus.message}
                    </div>
                )}

                <div className="database-actions">
                    <button onClick={downloadSampleCSV} className="secondary-btn">
                        ⬇️ Télécharger un modèle CSV
                    </button>
                    {equipmentDatabase.length > 0 && (
                        <button onClick={clearDatabase} className="danger-btn">
                            🗑️ Effacer la base de données
                        </button>
                    )}
                </div>

                {/* Database Statistics */}
                {databaseMeta && (
                    <div className="database-stats">
                        <div className="stat-card">
                            <div className="stat-value">{databaseMeta.totalItems}</div>
                            <div className="stat-label">Équipements</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{uniqueAgents}</div>
                            <div className="stat-label">Agents</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">
                                {new Date(databaseMeta.uploadDate).toLocaleDateString('fr-FR')}
                            </div>
                            <div className="stat-label">Dernière MAJ</div>
                        </div>
                    </div>
                )}

                {/* Database Preview */}
                {equipmentDatabase.length > 0 && (
                    <div className="database-preview">
                        <div className="preview-header">
                            <h3>Aperçu de la base de données</h3>
                            <input
                                type="text"
                                placeholder="🔍 Rechercher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                        <div className="preview-table-container">
                            <table className="preview-table">
                                <thead>
                                    <tr>
                                        <th>ID Code-barres</th>
                                        <th>Équipement</th>
                                        <th>Type</th>
                                        <th>Agent</th>
                                        <th>Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedItems.map((item, index) => (
                                        <tr key={index}>
                                            <td className="barcode-cell">{item.barcode_id}</td>
                                            <td>{item.equipment_name || '-'}</td>
                                            <td>{item.equipment_type || '-'}</td>
                                            <td>{item.agent_name || '-'}</td>
                                            <td>
                                                <span className={`status-badge ${item.status?.toLowerCase().replace(/\s/g, '-')}`}>
                                                    {item.status || '-'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredDatabase.length > 10 && (
                            <p className="preview-footer">
                                Affichage de 10 sur {filteredDatabase.length} résultats
                            </p>
                        )}
                    </div>
                )}
            </section>

            {/* Scanner Configuration Section */}
            <section className="settings-section">
                <h2>🔧 Configuration du scanner</h2>

                <div className="settings-options">
                    <div className="setting-item">
                        <div className="setting-info">
                            <label className="setting-label">Nombre de détections pour validation</label>
                            <p className="setting-description">
                                Nombre de fois qu'un code-barres doit être détecté pour être validé
                            </p>
                        </div>
                        <select
                            value={scannerSettings.requiredDetections}
                            onChange={(e) => updateScannerSetting('requiredDetections', parseInt(e.target.value))}
                            className="setting-select"
                        >
                            <option value={2}>2 détections</option>
                            <option value={3}>3 détections</option>
                        </select>
                    </div>

                    <div className="setting-item">
                        <div className="setting-info">
                            <label className="setting-label">Retour haptique (vibrations)</label>
                            <p className="setting-description">
                                Activer les vibrations lors de la détection de codes-barres
                            </p>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={scannerSettings.vibrationEnabled}
                                onChange={(e) => updateScannerSetting('vibrationEnabled', e.target.checked)}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </section>
        </div>
    )
}

export default SettingsPage
