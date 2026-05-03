// ===== scriptChart.js =====

// Fungsi pembaca CSV yang aman (mengabaikan koma di dalam tanda kutip pesan Feedback)
function parseCSVForm(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const data = [];
    for(let i = 1; i < lines.length; i++) {
        // Memisahkan koma, tapi mengabaikan koma yang ada di dalam tanda kutip ganda ""
        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const obj = {};
        headers.forEach((h, index) => {
            let val = row[index] ? row[index].replace(/^"|"$/g, '').trim() : '';
            obj[h] = val;
        });
        data.push(obj);
    }
    return data;
}

// 1. Fetch file CSV dari Google Forms
fetch('output/Respon form penonton - Form Responses 1.csv')
    .then(response => response.text())
    .then(csvText => {
        const rows = parseCSVForm(csvText);
        
        // Tempat penampungan jumlah
        const umurCount = {};
        const jamCount = {};
        
        // Kita cari nama kolom aslinya (berjaga-jaga jika ada spasi tersembunyi)
        const headers = Object.keys(rows[0] || {});
        const umurKey = headers.find(h => h.includes('Umur'));
        const jamKey = headers.find(h => h.includes('Jam Mulai'));

        // 2. Hitung datanya
        rows.forEach(r => {
            const umur = r[umurKey];
            const jam = r[jamKey];
            
            if(umur) {
                umurCount[umur] = (umurCount[umur] || 0) + 1;
            }
            if(jam) {
                jamCount[jam] = (jamCount[jam] || 0) + 1;
            }
        });
        
        // 3. Tampilkan grafiknya
        renderUmurChart(umurCount);
        renderJamChart(jamCount);
    })
    .catch(error => console.error("Gagal memuat CSV Survei:", error));

// Fungsi Menggambar Pie Chart (Umur)
function renderUmurChart(dataObj) {
    const ctx = document.getElementById('umurChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(dataObj),
            datasets: [{
                label: 'Jumlah Penonton',
                data: Object.values(dataObj),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: 'Distribusi Umur Penonton' }
            }
        }
    });
}

// Fungsi Menggambar Bar Chart (Jam Menonton)
function renderJamChart(dataObj) {
    const ctx = document.getElementById('jamChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(dataObj),
            datasets: [{
                label: 'Jumlah Responden',
                data: Object.values(dataObj),
                backgroundColor: '#36A2EB'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: 'Preferensi Jam Mulai Menonton' },
                legend: { display: false }
            }
        }
    });
}