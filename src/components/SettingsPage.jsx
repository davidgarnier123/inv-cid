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
            if (lines.length < 1) {
                throw new Error('Le fichier CSV doit contenir au moins une ligne de données')
            }

            // Check if first line looks like a header (contains text like "Marque" or "Type")
            const firstLine = lines[0].toLowerCase()
            const hasHeader = firstLine.includes('marque') || firstLine.includes('type') || firstLine.includes('modèle')

            // If has header, skip it; otherwise parse from line 0
            const dataLines = hasHeader ? lines.slice(1) : lines

            // Parse data - CSV uses semicolon (;) as separator
            const data = dataLines.map((line, index) => {
                const values = line.split(';').map(v => v.trim())

                // Expected columns based on user's format:
                // 0: Marque, 1: Type, 2: Modèle, 3: Numéro de série (barcode),
                // 4: Chemin organisationnel, 5: Agent, 6: Date acquisition,
                // 7: IP, 8: MAC, 9: Code, 10: ID interne, 11: Info supplémentaire,
                // 12: Connecté à

                const obj = {
                    barcode_id: values[3] || '', // Numéro de série = barcode
                    brand: values[0] || '',
                    equipment_type: values[1] || '',
                    model: values[2] || '',
                    serial_number: values[3] || '',
                    org_path: values[4] || '',
                    agent_name: values[5] || '',
                    acquisition_date: values[6] || '',
                    ip_address: values[7] || '',
                    mac_address: values[8] || '',
                    code: values[9] || '',
                    internal_id: values[10] || '',
                    extra_info: values[11] || '',
                    connected_to: values[12] || ''
                }
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

        reader.readAsText(file, 'UTF-8')
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
        const sampleCSV = `Marque;Type;Modèle;Numéro de série;Chemin organisationnel;Agent;Date acquisition;IP;MAC;Code;ID interne;Info;Connecté à
LENOVO;Périphérique;Station d'accueil Lenovo ThinkPad USB-C Dock Gen 2;ZKW1B16J;/Services/IT/Paris;Dupont Jean;2020/11/02;;;;1166459;;"connecté à"
LENOVO;Ordinateur;Thinkpad E595;PF2D0J69;/Services/IT/Paris;Dupont Jean;2020/09/29;10.76.51.173;00:2B:67:B2:6E:8E;Z017-1905374;1905374;;
ALCATEL;Téléphone;8028S;FUM212412616;/Services/IT/Paris;Dupont Jean;2021/11/04;;48:7A:55:1C:29:85;;1908623;;
ACER;Moniteur;V226HQLbd;MMLXLEE005220149374267;/Services/IT/Paris;Dupont Jean;2022/12/23;;;;2035050;TELETRAVAIL;"connecté à"
Philips;Moniteur;242S9JML/00;UK02443026503;/Services/IT/Lyon;Martin Marie;2025/02/14;;;;2292034;;1905374
Philips;Moniteur;242S9JML/00;UK02443026192;/Services/IT/Lyon;Martin Marie;2025/02/14;;;;2292048;;1905374`

        const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8' })
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
            item.serial_number?.toLowerCase().includes(search) ||
            item.brand?.toLowerCase().includes(search) ||
            item.model?.toLowerCase().includes(search) ||
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
                    <p className="upload-hint">Format CSV avec séparateur point-virgule (;). Le numéro de série sera utilisé comme code-barres.</p>
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
                                        <th>N° Série</th>
                                        <th>Marque</th>
                                        <th>Type</th>
                                        <th>Modèle</th>
                                        <th>Agent</th>
                                        <th>Date acquisition</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedItems.map((item, index) => (
                                        <tr key={index}>
                                            <td className="barcode-cell">{item.serial_number || item.barcode_id}</td>
                                            <td>{item.brand || '-'}</td>
                                            <td>{item.equipment_type || '-'}</td>
                                            <td>{item.model || '-'}</td>
                                            <td>{item.agent_name || '-'}</td>
                                            <td>{item.acquisition_date || '-'}</td>
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
