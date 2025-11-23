import React from 'react'
import './Navigation.css'

function Navigation({ currentPage, setCurrentPage, onStopScanning }) {
    const navItems = [
        { id: 'scan', label: 'Scanner', icon: '📷' },
        { id: 'search', label: 'Recherche', icon: '🔍' },
        { id: 'inventories', label: 'Inventaires', icon: '📋' },
        { id: 'settings', label: 'Paramètres', icon: '⚙️' }
    ]

    const handleNavClick = (pageId) => {
        if (onStopScanning && currentPage === 'scan') {
            onStopScanning()
        }
        setCurrentPage(pageId)
    }

    return (
        <>
            {/* Desktop Top Navigation */}
            <nav className="desktop-nav">
                <div className="nav-container">
                    <div className="nav-logo">📦 ScanApp</div>
                    <div className="nav-links">
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleNavClick(item.id)}
                                className={`nav-btn ${currentPage === item.id ? 'active' : ''}`}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span className="nav-label">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </nav>

            {/* Mobile Bottom Navigation */}
            <nav className="mobile-bottom-nav">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`mobile-nav-item ${currentPage === item.id ? 'active' : ''}`}
                    >
                        <span className="mobile-nav-icon">{item.icon}</span>
                        <span className="mobile-nav-label">{item.label}</span>
                    </button>
                ))}
            </nav>
        </>
    )
}

export default Navigation
