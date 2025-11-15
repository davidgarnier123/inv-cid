import { useState, useRef } from 'react'
import BarcodeScanner from './components/BarcodeScanner'
import InventoriesPage from './components/InventoriesPage'
import './App.css'

// Liste fictive d'agents
const AGENTS = [
  { id: 1, name: 'Jean Dupont' },
  { id: 2, name: 'Marie Martin' },
  { id: 3, name: 'Pierre Durand' },
  { id: 4, name: 'Sophie Bernard' },
  { id: 5, name: 'Luc Moreau' }
]

function App() {
  const [currentPage, setCurrentPage] = useState('scan') // 'scan' ou 'inventories'
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [sessionCodes, setSessionCodes] = useState([])
  const [inventories, setInventories] = useState([])
  const [showAgentForm, setShowAgentForm] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const scannerRef = useRef(null)

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
    setSelectedAgent('')
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

    const agent = AGENTS.find(a => a.id === parseInt(selectedAgent))
    const newInventory = {
      id: Date.now(),
      agent: agent,
      codes: [...sessionCodes],
      date: new Date().toLocaleString('fr-FR'),
      count: sessionCodes.length
    }

    setInventories(prev => [newInventory, ...prev])
    setIsSessionActive(false)
    setSessionCodes([])
    setShowAgentForm(false)
    setSelectedAgent('')
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
      <nav className="main-nav">
        <button 
          onClick={() => {
            // Arrêter la caméra si on change de page
            if (scannerRef.current && currentPage === 'scan') {
              scannerRef.current.stopScanning()
            }
            setCurrentPage('scan')
          }}
          className={`nav-btn ${currentPage === 'scan' ? 'active' : ''}`}
        >
          📷 Scanner
        </button>
        <button 
          onClick={() => {
            // Arrêter la caméra si on change de page
            if (scannerRef.current && currentPage === 'scan') {
              scannerRef.current.stopScanning()
            }
            setCurrentPage('inventories')
          }}
          className={`nav-btn ${currentPage === 'inventories' ? 'active' : ''}`}
        >
          📋 Inventaires ({inventories.length})
        </button>
      </nav>

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
                  <div className="session-info">
                    <span className="session-badge">Session active</span>
                    <span className="session-count">{sessionCodes.length} code(s) scanné(s)</span>
                  </div>
                  <div className="session-actions">
                    <button onClick={endSession} className="end-session-btn">
                      ✓ Terminer la session
                    </button>
                    <button onClick={cancelSession} className="cancel-session-btn">
                      ✕ Annuler
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
                />
                
                <div className="session-codes">
                  <div className="session-codes-header">
                    <span>Codes scannés dans cette session ({sessionCodes.length})</span>
                  </div>
                  {sessionCodes.length > 0 && (
                    <div className="session-codes-list">
                      {sessionCodes.map((code, index) => (
                        <div key={index} className="session-code-item">
                          <span className="code-value">{code}</span>
                          <button 
                            onClick={() => removeCodeFromSession(code)}
                            className="remove-code-btn"
                            title="Retirer ce code"
                          >
                            ×
                          </button>
                        </div>
                      ))}
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
                  <label htmlFor="agent-select">Sélectionner un agent :</label>
                  <select
                    id="agent-select"
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="agent-select"
                  >
                    <option value="">-- Choisir un agent --</option>
                    {AGENTS.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
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

        {currentPage === 'inventories' && (
          <InventoriesPage inventories={inventories} />
        )}
      </main>
    </div>
  )
}

export default App
