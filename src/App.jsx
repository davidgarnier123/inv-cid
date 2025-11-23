import { useState, useRef, useEffect, useMemo } from 'react'
import BarcodeScanner from './components/BarcodeScanner'
import InventoriesPage from './components/InventoriesPage'
import SettingsPage from './components/SettingsPage'
import DatabaseSearch from './components/DatabaseSearch'
import Navigation from './components/Navigation'
import EquipmentModal, { getEquipmentIcon } from './components/EquipmentModal'

import './App.css'



function App() {
  const [currentPage, setCurrentPage] = useState('scan') // 'scan', 'inventories', 'settings', 'search'
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [sessionCodes, setSessionCodes] = useState([])
  const [inventories, setInventories] = useState([])
  const [showAgentForm, setShowAgentForm] = useState(false)

  // Agent Autocomplete State
  const [agentSearch, setAgentSearch] = useState('')
  const [selectedAgent, setSelectedAgent] = useState(null) // Object { name, service }
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [showManualInput, setShowManualInput] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const scannerRef = useRef(null)

  // Equipment modal state
  const [selectedEquipment, setSelectedEquipment] = useState(null)

  // Equipment database and scanner settings
  const [equipmentDatabase, setEquipmentDatabase] = useState([])
  const [scannerSettings, setScannerSettings] = useState({
    requiredDetections: 2,
    vibrationEnabled: true
  })

  // Load equipment database and settings from localStorage on mount
  useEffect(() => {
    const savedDatabase = localStorage.getItem('equipmentDatabase')
    if (savedDatabase) {
      try {
        setEquipmentDatabase(JSON.parse(savedDatabase))
      } catch (e) {
        console.error('Error loading equipment database:', e)
      }
    }

    const savedSettings = localStorage.getItem('scannerSettings')
    if (savedSettings) {
      try {
        setScannerSettings(JSON.parse(savedSettings))
      } catch (e) {
        console.error('Error loading scanner settings:', e)
      }
    }

    const savedInventories = localStorage.getItem('inventories')
    if (savedInventories) {
      try {
        setInventories(JSON.parse(savedInventories))
      } catch (e) {
        console.error('Error loading inventories:', e)
      }
    }
  }, [])

  // Save inventories to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('inventories', JSON.stringify(inventories))
  }, [inventories])

  // Extract unique agents from equipment database
  const agentsList = useMemo(() => {
    const uniqueAgents = new Map()

    equipmentDatabase.forEach(item => {
      if (item.agent_name && item.agent_name !== '""') {
        // Use name as key to ensure uniqueness
        if (!uniqueAgents.has(item.agent_name)) {
          uniqueAgents.set(item.agent_name, {
            name: item.agent_name,
            service: item.org_path || 'Service inconnu'
          })
        }
      }
    })

    return Array.from(uniqueAgents.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [equipmentDatabase])

  // Filter agents based on search
  const filteredAgents = useMemo(() => {
    if (!agentSearch) return []
    const searchLower = agentSearch.toLowerCase()
    return agentsList.filter(agent =>
      agent.name.toLowerCase().includes(searchLower)
    ).slice(0, 5) // Limit to 5 suggestions
  }, [agentSearch, agentsList])

  const handleAgentSelect = (agent) => {
    setSelectedAgent(agent)
    setAgentSearch(agent.name)
    setShowSuggestions(false)
  }

  // Get equipment info by barcode ID
  const getEquipmentInfo = (barcodeId) => {
    return equipmentDatabase.find(item => item.barcode_id === barcodeId)
  }

  const handleScan = (code) => {
    if (!isSessionActive) return

    // Vérifier si le code existe déjà dans la session
    setSessionCodes(prev => {
      const codeExists = prev.includes(code)
      if (codeExists) {
        return prev // Ne pas ajouter de doublon
      }
      return [...prev, code]
    })
  }

  const startSession = () => {
    setIsSessionActive(true)
    setSessionCodes([])
    setShowAgentForm(false)
    setSelectedAgent(null)
    setAgentSearch('')
  }

  const endSession = () => {
    // Arrêter la caméra
    if (scannerRef.current) {
      scannerRef.current.stopScanning()
    }

    if (sessionCodes.length > 0) {
      setShowAgentForm(true)
      setIsSessionActive(false)
    } else {
      setIsSessionActive(false)
    }
  }

  const cancelSession = () => {
    // Arrêter la caméra
    if (scannerRef.current) {
      scannerRef.current.stopScanning()
    }

    setIsSessionActive(false)
    setSessionCodes([])
    setShowAgentForm(false)
    setSelectedAgent('')
  }

  const createInventory = () => {
    if (!selectedAgent || sessionCodes.length === 0) return

    const newInventory = {
      id: Date.now(),
      agent: selectedAgent, // selectedAgent is now the object {name, service}
      codes: [...sessionCodes],
      date: new Date().toLocaleString('fr-FR'),
      count: sessionCodes.length
    }

    setInventories(prev => [newInventory, ...prev])
    setIsSessionActive(false)
    setSessionCodes([])
    setShowAgentForm(false)
    setSelectedAgent(null)
    setAgentSearch('')
    setCurrentPage('inventories') // Redirect to inventories page
  }

  const deleteInventory = (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette fiche d\'inventaire ?')) {
      setInventories(prev => prev.filter(inv => inv.id !== id))
    }
  }

  const removeCodeFromSession = (code) => {
    setSessionCodes(prev => prev.filter(c => c !== code))
  }

  const handleManualCodeSubmit = (e) => {
    e.preventDefault()
    const code = manualCode.trim()

    if (code.length > 0) {
      // Démarrer une session si elle n'est pas active
      if (!isSessionActive) {
        setIsSessionActive(true)
      }

      // Vérifier si le code existe déjà dans la session
      if (!sessionCodes.includes(code)) {
        setSessionCodes(prev => [...prev, code])
        setManualCode('')
        setShowManualInput(false)
      } else {
        alert('Ce code est déjà dans la session')
      }
    }
  }

  return (
    <div className="app">
      <Navigation
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onStopScanning={() => {
          if (scannerRef.current) {
            scannerRef.current.stopScanning()
          }
        }}
      />

      <main className="app-main">
        {currentPage === 'scan' && (
          <>
            <div className="session-controls">
              {!isSessionActive ? (
                <button onClick={startSession} className="start-session-btn">
                  🚀 Démarrer une session de scan
                </button>
              ) : (
                <div className="session-active">
                  <div className="session-info-compact">
                    <span className="session-badge-compact">Session active</span>
                    <span className="session-count-compact">{sessionCodes.length} code(s)</span>
                  </div>
                  <div className="session-actions-compact">
                    <button onClick={endSession} className="end-session-btn-compact" title="Terminer la session">
                      ✓
                    </button>
                    <button onClick={cancelSession} className="cancel-session-btn-compact" title="Annuler">
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>

            {isSessionActive && (
              <>
                <BarcodeScanner
                  ref={scannerRef}
                  onScan={handleScan}
                  enabled={isSessionActive}
                  requiredDetections={scannerSettings.requiredDetections}
                  vibrationEnabled={scannerSettings.vibrationEnabled}
                />



                <div className="session-codes">

                  {sessionCodes.length > 0 && (
                    <div className="session-codes-list">
                      {sessionCodes.map((code, index) => {
                        const equipmentInfo = getEquipmentInfo(code)
                        const equipmentIcon = equipmentInfo ? getEquipmentIcon(equipmentInfo.equipment_type) : '📦'

                        return (
                          <div
                            key={index}
                            className="session-code-item"
                            onClick={() => {
                              if (equipmentInfo) {
                                console.log('Opening modal for:', equipmentInfo)
                                setSelectedEquipment(equipmentInfo)
                              }
                            }}
                          >
                            {/* Icon Column */}
                            <span className="equipment-icon">{equipmentIcon}</span>

                            {/* Content Column */}
                            {equipmentInfo ? (
                              <div className="equipment-details">
                                <span className="equipment-name">
                                  {equipmentInfo.brand} {equipmentInfo.model}
                                </span>
                                <span className="code-value">{code}</span>
                                <div className="equipment-meta">
                                  {equipmentInfo.equipment_type && (
                                    <span className="equipment-type">
                                      {equipmentInfo.equipment_type}
                                    </span>
                                  )}
                                  {equipmentInfo.agent_name && (
                                    <span className="equipment-agent">
                                      👤 {equipmentInfo.agent_name}
                                    </span>
                                  )}
                                  {equipmentInfo.connected_to && equipmentInfo.connected_to !== 'connecté à' && (
                                    <span className="equipment-connection">
                                      🔗 {equipmentInfo.connected_to}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="code-value">{code}</span>
                            )}

                            {/* Action Column */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                removeCodeFromSession(code)
                              }}
                              className="remove-code-btn"
                              title="Retirer ce code"
                            >
                              ×
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="session-codes-footer">
                    <button
                      onClick={() => setShowManualInput(true)}
                      className="manual-input-btn-footer"
                      title="Saisir un code-barres manuellement"
                    >
                      ⌨️ Ajouter manuellement
                    </button>
                  </div>
                </div>
              </>
            )}

            {showManualInput && (
              <div className="manual-input-modal">
                <div className="manual-input-content">
                  <div className="manual-input-header">
                    <h3>Saisie manuelle</h3>
                    <button
                      onClick={() => {
                        setShowManualInput(false)
                        setManualCode('')
                      }}
                      className="close-modal-btn"
                    >
                      ×
                    </button>
                  </div>
                  <form onSubmit={handleManualCodeSubmit}>
                    <div className="form-group">
                      <label htmlFor="manual-code">Code-barres :</label>
                      <input
                        id="manual-code"
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="Ex: 1234567"
                        className="manual-code-input"
                        autoFocus
                        pattern="[0-9A-Za-z]*"
                        title="Saisissez le code-barres (chiffres et lettres acceptés)"
                      />
                      <small className="input-hint">Généralement 7 chiffres, mais flexible</small>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="add-manual-code-btn">
                        ✓ Ajouter
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowManualInput(false)
                          setManualCode('')
                        }}
                        className="cancel-form-btn"
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {showAgentForm && (
              <div className="agent-form">
                <h3>Finaliser l'inventaire</h3>
                <p className="form-info">{sessionCodes.length} code(s) à associer</p>

                <div className="form-group">
                  <label htmlFor="agent-search">Sélectionner un agent :</label>
                  <div className="autocomplete-wrapper">
                    <input
                      id="agent-search"
                      type="text"
                      value={agentSearch}
                      onChange={(e) => {
                        setAgentSearch(e.target.value)
                        setShowSuggestions(true)
                        if (selectedAgent && e.target.value !== selectedAgent.name) {
                          setSelectedAgent(null) // Clear selection if modified
                        }
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      placeholder="Rechercher nom ou prénom..."
                      className="agent-search-input"
                      autoComplete="off"
                    />
                    {showSuggestions && agentSearch && filteredAgents.length > 0 && (
                      <ul className="autocomplete-suggestions">
                        {filteredAgents.map((agent, index) => (
                          <li
                            key={index}
                            onClick={() => handleAgentSelect(agent)}
                            className="suggestion-item"
                          >
                            <span className="suggestion-name">{agent.name}</span>
                            <span className="suggestion-service">{agent.service}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    onClick={createInventory}
                    className="create-inventory-btn"
                    disabled={!selectedAgent}
                  >
                    ✓ Créer la fiche d'inventaire
                  </button>
                  <button onClick={cancelSession} className="cancel-form-btn">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {currentPage === 'search' && (
          <DatabaseSearch
            equipmentDatabase={equipmentDatabase}
            onEquipmentClick={setSelectedEquipment}
          />
        )}

        {currentPage === 'inventories' && (
          <InventoriesPage
            inventories={inventories}
            onDelete={deleteInventory}
          />
        )}

        {currentPage === 'settings' && (
          <SettingsPage
            equipmentDatabase={equipmentDatabase}
            setEquipmentDatabase={setEquipmentDatabase}
            scannerSettings={scannerSettings}
            setScannerSettings={setScannerSettings}
          />
        )}
      </main>

      {/* Equipment Detail Modal */}
      {selectedEquipment && (
        <>
          {console.log('Rendering modal with equipment:', selectedEquipment)}
          <EquipmentModal
            equipment={selectedEquipment}
            onClose={() => setSelectedEquipment(null)}
          />
        </>
      )}
    </div>
  )
}

export default App
