// Configuration
const MASTERLIST_URL = 'https://master.vc-mp.org/servers/';
const STATUS_API_BASE = 'https://vcmp-servers-status.onrender.com';
const REFRESH_INTERVAL = 30000; // 30 seconds
const ICON_BASE_URL = 'https://github.com/vancityspiller/vcmp-browser/blob/master/src/components/Navbar/icons/logo.png'; // Replace with your icon CDN

// Global variables
let allServers = [];
let serverDetailsCache = {};

// DOM elements
const serversTable = document.getElementById('serversTable');
const searchInput = document.getElementById('searchInput');
const officialOnlyCheckbox = document.getElementById('officialOnly');
const lastUpdatedSpan = document.getElementById('lastUpdated');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadServers();
    
    // Set up auto-refresh
    setInterval(loadServers, REFRESH_INTERVAL);
    
    // Set up search/filter
    searchInput.addEventListener('input', filterServers);
    officialOnlyCheckbox.addEventListener('change', filterServers);
});

async function loadServers() {
    try {
        const response = await fetch(MASTERLIST_URL);
        const data = await response.json();
        
        if (data.success && data.servers) {
            allServers = data.servers;
            updateLastUpdated();
            filterServers();
            
            // Pre-fetch details for visible servers
            fetchServerDetailsForVisibleServers();
        } else {
            throw new Error('Invalid server data');
        }
    } catch (error) {
        console.error('Failed to load servers:', error);
        serversTable.innerHTML = `
            <tr>
                <td colspan="5" class="loading error">
                    Failed to load servers. Please try again later.
                </td>
            </tr>
        `;
    }
}

function filterServers() {
    const searchTerm = searchInput.value.toLowerCase();
    const officialOnly = officialOnlyCheckbox.checked;
    
    const filteredServers = allServers.filter(server => {
        // Filter by official status
        if (officialOnly && !server.is_official) return false;
        
        // Filter by search term (would search server name if available)
        // Since our masterlist doesn't include names, we'll search by IP
        if (searchTerm) {
            return server.ip.toLowerCase().includes(searchTerm) || 
                   server.port.toString().includes(searchTerm);
        }
        
        return true;
    });
    
    displayServers(filteredServers);
}

function displayServers(servers) {
    if (servers.length === 0) {
        serversTable.innerHTML = `
            <tr>
                <td colspan="5" class="loading">
                    No servers found matching your criteria.
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    servers.forEach(server => {
        const cacheKey = `${server.ip}:${server.port}`;
        const details = serverDetailsCache[cacheKey];
        
        html += `
            <tr data-ip="${server.ip}" data-port="${server.port}">
                <td class="server-name">
                    <img src="${ICON_BASE_URL}" class="server-icon" 
                         alt="${server.is_official ? 'Official' : 'Community'} server">
                    ${server.ip}:${server.port}
                    ${server.is_official ? '<i class="fas fa-check-circle official-badge" title="Official Server"></i>' : ''}
                </td>
                <td>
                    <span class="server-status ${details ? 'status-online' : 'status-offline'}">
                        ${details ? 'Online' : 'Checking...'}
                    </span>
                </td>
                <td class="players-count">
                    ${details ? `${details.players?.length || 0}/${details.maxPlayers || 100}` : '-'}
                </td>
                <td>${details ? (details.ping || 'N/A') : '-'}</td>
                <td>${details ? (details.gamemode || 'Unknown') : '-'}</td>
            </tr>
        `;
    });
    
    serversTable.innerHTML = html;
}

async function fetchServerDetailsForVisibleServers() {
    const visibleRows = serversTable.querySelectorAll('tr[data-ip]');
    
    for (const row of visibleRows) {
        const ip = row.getAttribute('data-ip');
        const port = row.getAttribute('data-port');
        const cacheKey = `${ip}:${port}`;
        
        // Skip if already in cache
        if (serverDetailsCache[cacheKey]) continue;
        
        try {
            const response = await fetch(`${STATUS_API_BASE}/${ip}/${port}`);
            if (response.ok) {
                const data = await response.json();
                serverDetailsCache[cacheKey] = data;
                
                // Update the specific row
                updateServerRow(row, data);
            } else {
                serverDetailsCache[cacheKey] = null;
            }
        } catch (error) {
            console.error(`Failed to fetch details for ${ip}:${port}`, error);
            serverDetailsCache[cacheKey] = null;
        }
    }
}

function updateServerRow(row, details) {
    const statusCell = row.querySelector('.server-status');
    const playersCell = row.querySelector('.players-count');
    const pingCell = row.cells[3];
    const gamemodeCell = row.cells[4];
    
    if (details) {
        statusCell.className = 'server-status status-online';
        statusCell.textContent = 'Online';
        
        playersCell.textContent = `${details.players?.length || 0}/${details.maxPlayers || 100}`;
        playersCell.className = 'players-count players-online';
        
        pingCell.textContent = details.ping || 'N/A';
        gamemodeCell.textContent = details.gamemode || 'Unknown';
    } else {
        statusCell.className = 'server-status status-offline';
        statusCell.textContent = 'Offline';
        
        playersCell.textContent = '-';
        playersCell.className = 'players-count';
        
        pingCell.textContent = '-';
        gamemodeCell.textContent = '-';
    }
}

function updateLastUpdated() {
    const now = new Date();
    lastUpdatedSpan.textContent = now.toLocaleTimeString();
}

// Add some error handling for the fetch API
window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled rejection (promise):', event.reason);
});
