// USA Interactive Map Script

const SHEET_URL = "https://opensheet.vercel.app/1uCznuNBvbiWgRvg5LXse-I9AwkvZuuBG8WJDuIYC7cQ/Sheet1";
const GEOJSON_URL = "us-states.json";

const map = L.map('usa-map', {
  zoomControl: true,
  attributionControl: false,
  minZoom: 3,
  maxZoom: 7
}).setView([37.8, -96], 4);

const sidebar = document.getElementById('state-sidebar');
const toggleBtn = document.getElementById('sidebar-toggle-btn');
const detailPanel = document.getElementById('state-detail-panel');
let infoBox = null;
let currentStateLayer = null;
let stateData = {};
let sheetStateList = [];

// Sidebar toggle for mobile
toggleBtn.onclick = () => {
  sidebar.classList.toggle('open');
  if (sidebar.classList.contains('open')) sidebar.scrollTop = 0;
};

// Dismiss popups and panel on map click
map.on('click', function() {
  if (window.innerWidth < 900) sidebar.classList.remove('open');
  if (infoBox) infoBox.remove();
  if (detailPanel) {
    detailPanel.innerHTML = '';
    detailPanel.classList.remove("active");
  }
});

Promise.all([
  fetch(SHEET_URL).then(res => res.json()),
  fetch(GEOJSON_URL).then(res => res.json())
]).then(([rows, data]) => {
  // --- Parse Sheet rows ---
  stateData = {};
  sheetStateList = [];
  rows.forEach(row => {
    const name = (row.state || row.State || '').trim();
    if (name) {
      stateData[name] = {
        capital: row.capital || row.Capital || '',
        governor: row.governor || row.Governor || '',
        special: row.special || row.Special || row['Special Features'] || '',
        famous: row.famous || row.Famous || row['Famous For'] || ''
      };
      sheetStateList.push(name);
    }
  });

  // --- Draw GeoJSON states on the map ---
  const geoLayer = L.geoJSON(data, {
    onEachFeature: (feature, layer) => {
      const name = feature.properties.name || 'Unknown State';
      layer.on('click', () => {
        focusOnState(layer, name);
      });
    },
    style: () => {
      // Soft random pastel
      const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
      return {
        color: '#222',
        weight: 2,
        fillColor: randomColor,
        fillOpacity: 0.6
      };
    }
  }).addTo(map);

  // >>>> THIS LINE AUTO-FITS THE MAP TO ALL STATES <<<<
  map.fitBounds(geoLayer.getBounds());

  // --- Build sidebar state list (sheet order) ---
  sheetStateList.forEach(name => {
    const listItem = document.createElement('li');
    listItem.textContent = name;
    listItem.onclick = () => {
      sidebar.classList.remove('open');
      // Find the GeoJSON layer for this state and trigger focus
      geoLayer.eachLayer(layer => {
        if ((layer.feature && layer.feature.properties.name) === name) {
          focusOnState(layer, name);
        }
      });
    };
    document.getElementById('state-list').appendChild(listItem);
  });

  // --- Highlight and focus function ---
  function focusOnState(layer, name) {
    if (currentStateLayer) geoLayer.resetStyle(currentStateLayer);
    currentStateLayer = layer;

    geoLayer.eachLayer(l => l.setStyle({ fillOpacity: 0.18 }));
    layer.setStyle({ fillOpacity: 1 });

    const info = stateData[name] || {};

    // Desktop: Show floating info box
    if (window.innerWidth >= 900) {
      if (infoBox) infoBox.remove();
      infoBox = document.createElement('div');
      infoBox.className = 'state-popup';
      infoBox.innerHTML = `
        <button class="close-popup" onclick="window.resetMapView()" title="Close">&times;</button>
        <h3>${name}</h3>
        <p><strong>Capital:</strong> ${info.capital || 'N/A'}</p>
        <p><strong>Governor:</strong> ${info.governor || 'N/A'}</p>
        <p><strong>Special:</strong> ${info.special || 'N/A'}</p>
        <p><strong>Famous For:</strong> ${info.famous || 'N/A'}</p>
        <button onclick="window.resetMapView()">Back to USA View</button>`;
      document.body.appendChild(infoBox);
    }

    // Mobile: Show sliding panel at bottom
    if (window.innerWidth < 900) {
      if (detailPanel) {
        detailPanel.innerHTML = `
          <h3>${name}</h3>
          <p><strong>Capital:</strong> ${info.capital || 'N/A'}</p>
          <p><strong>Governor:</strong> ${info.governor || 'N/A'}</p>
          <p><strong>Special:</strong> ${info.special || 'N/A'}</p>
          <p><strong>Famous For:</strong> ${info.famous || 'N/A'}</p>
          <button style="margin-top:8px;background:#eaeaea;border:none;padding:7px 16px;border-radius:6px;font-size:1em;cursor:pointer;" onclick="window.resetMapView()">Back to USA View</button>
        `;
        detailPanel.classList.add("active");
        detailPanel.scrollIntoView({ behavior: "smooth" });
      }
    }
  }

  // --- Reset map view utility ---
  window.resetMapView = function () {
    geoLayer.eachLayer(l => geoLayer.resetStyle(l));
    if (infoBox) infoBox.remove();
    if (detailPanel) {
      detailPanel.innerHTML = '';
      detailPanel.classList.remove("active");
    }
  };

  // --- Responsive: close sidebar when switching to desktop ---
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 900) sidebar.classList.remove('open');
  });
});
