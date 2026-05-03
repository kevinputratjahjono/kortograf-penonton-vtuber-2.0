// 1. Inisialisasi Peta
const map = L.map('map', {
    zoomControl: false,
    attributionControl: false
}).setView([-2.5, 118], 5);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// 2. Fungsi Pewarnaan (Berdasarkan jumlah Views YouTube)
function getColor(d) {
    return d > 100 ? '#800026' :
           d > 50  ? '#BD0026' :
           d > 20  ? '#E31A1C' :
           d > 10  ? '#FD8D3C' :
           d > 5   ? '#FEB24C' :
           d > 0   ? '#7CFC00' :
                     '#00FF00'; // Hijau jika 0
}

// 3. Fungsi Normalisasi Nama Provinsi
function normalizeName(name) {
    if (!name) return "";
    return name.toString()
        .toUpperCase()
        .replace("PROVINSI ", "")
        .replace("DKI ", "")
        .replace("DI ", "")
        .trim();
}

// 4. Fungsi Parse CSV (Menangani koma di dalam tanda kutip)
function parseCSV(text) {
    const lines = text.trim().split('\n');
    return lines.map(line => line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));
}

let geojsonLayer;

// 5. Load Semua Data
Promise.all([
    fetch('output/indonesia_provinces.csv').then(res => res.text()),
    fetch('output/Respon form penonton - Form Responses 1.csv').then(res => res.text()),
    fetch('indonesia_provinces.geojson').then(res => res.json())
]).then(([ytText, surveyText, geojsonData]) => {

    // --- SINKRONISASI DATA YOUTUBE ---
    const ytRows = parseCSV(ytText);
    const ytDataMap = {};
    ytRows.slice(1).forEach(cols => {
        const name = normalizeName(cols[0]);
        const views = parseInt(cols[1]) || 0;
        ytDataMap[name] = views;
    });

    // --- SINKRONISASI DATA SURVEI ---
    const surveyRows = parseCSV(surveyText);
    const surveyDataMap = {};
    surveyRows.slice(1).forEach(cols => {
        if (cols[5]) {
            const name = normalizeName(cols[5].replace(/^"|"$/g, ''));
            surveyDataMap[name] = (surveyDataMap[name] || 0) + 1;
        }
    });

    // --- GABUNGKAN KE GEOJSON ---
    geojsonData.features.forEach(feature => {
        // Cek properti nama di geojson (bisa PROVINSI atau NAME_1)
        const props = feature.properties;
        const rawName = props.PROVINSI || props.NAME_1 || props.name;
        const geoName = normalizeName(rawName);

        // Masukkan data hasil sinkronisasi
        feature.properties.ytViews = ytDataMap[geoName] || 0;
        feature.properties.surveyCount = surveyDataMap[geoName] || 0;
        
        // Gunakan ytViews sebagai penentu warna utama peta
        feature.properties.value = feature.properties.ytViews;
    });

    // Tampilkan ke Peta
    geojsonLayer = L.geoJson(geojsonData, {
        style: (f) => ({
            fillColor: getColor(f.properties.ytViews),
            weight: 1,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7
        }),
        onEachFeature: onEachFeature
    }).addTo(map);

    console.log("Sinkronisasi Berhasil!");

}).catch(err => console.error("Gagal sinkronisasi data:", err));

// 6. Fungsi Interaktif (Hover)
function onEachFeature(feature, layer) {
    layer.on({
        mouseover: (e) => {
            const l = e.target;
            l.setStyle({ weight: 2, color: '#333', fillOpacity: 0.8 });
            info.update(l.feature.properties);
        },
        mouseout: (e) => {
            geojsonLayer.resetStyle(e.target);
            info.update();
        },
        click: (e) => map.fitBounds(e.target.getBounds())
    });
}

// 7. Info Box (Kanan Atas)
const info = L.control({position: 'topright'});
info.onAdd = function () {
    this._div = L.DomUtil.create('div', 'info');
    this.update();
    return this._div;
};
info.update = function (props) {
    if (props) {
        const nama = props.PROVINSI || props.NAME_1 || props.name;
        this._div.innerHTML = `
            <h4>${nama}</h4>
            <b style="color:red">YouTube Views:</b> ${props.ytViews}<br />
            <b style="color:blue">Responden Survei:</b> ${props.surveyCount} orang
        `;
    } else {
        this._div.innerHTML = '<h4>Data Wilayah</h4>Sorot provinsi';
    }
};
info.addTo(map);