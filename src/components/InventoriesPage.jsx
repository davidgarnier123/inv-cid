function InventoriesPage({ inventories, onDelete }) {
  if (inventories.length === 0) {
    return (
      <div className="empty-inventories">
        <p>Aucune fiche d'inventaire pour le moment</p>
        <p className="empty-hint">Créez votre première fiche en scannant des codes-barres</p>
      </div>
    )
  }

  return (
    <div className="inventories-page">
      <h2>Fiches d'inventaire ({inventories.length})</h2>
      <div className="inventories">
        {inventories.map(inventory => (
          <div key={inventory.id} className="inventory-card">
            <div className="inventory-header">
              <div className="inventory-info">
                <div className="inventory-agent">
                  <strong>Agent :</strong> {inventory.agent.name}
                  {inventory.agent.service && <span className="inventory-service">({inventory.agent.service})</span>}
                </div>
                <div className="inventory-date">{inventory.date}</div>
              </div>
              <button
                className="delete-inventory-btn"
                onClick={() => onDelete(inventory.id)}
                title="Supprimer la fiche"
              >
                🗑️
              </button>
            </div>
            <div className="inventory-codes">
              <strong>Codes-barres ({inventory.count}) :</strong>
              <div className="codes-grid">
                {inventory.codes.map((code, index) => (
                  <span key={index} className="code-badge">{code}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default InventoriesPage

