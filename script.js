
const global = {
    webapi: 'https://restapi.qoupaystore.web.id',
    merchantIdOrderKuota: 'OK1930061',
    apiOrderKuota: '264532717411393231930061OKCTEA2858AE6A2AB7EE07D76E005EBA9F90',
    restapi: 'QHY3HGA7bR',
    qrisOrderKuota: '00020101021126670016COM.NOBUBANK.WWW01189360050300000879140214501293961406740303UMI51440014ID.CO.QRIS.WWW0215ID20243329452840303UMI5204541153033605802ID5922TOKO DIGITAL OK19300616005NGAWI61056321162070703A016304F3EF'
};

// Konfigurasi Pterodactyl
const API_CONFIG = {
    domain: 'https://rasyaapeivate.hosting-privateku.web.id',
    apiKeyPterodactyl: 'ptla_RPjl2qIq0AHJcSNrevvLMDJN4h9yoDuhpL50bI1Kteo',
    nestId: '5',
    eggId: '15', 
    locationId: '1'
};

// Variabel global untuk transaksi
let currentTransaction = null;
let paymentCheckInterval = null;

// Inisialisasi halaman
window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    const about = document.getElementById('about');
    setTimeout(() => {
        loader.classList.add('hidden');
        setTimeout(() => {
            about.classList.add('active');
        }, 200);
    }, 2500);

    // Setup form submit
    document.getElementById('orderForm').addEventListener('submit', function(e) {
        e.preventDefault();
        processOrder();
    });
});

// Fungsi navigasi halaman
function showAbout() {
    const currentPage = document.querySelector('.page.active');
    const about = document.getElementById('about');
    currentPage.classList.remove('active');
    currentPage.classList.add('hidden');
    setTimeout(() => {
        about.classList.remove('hidden');
        about.classList.add('active');
    }, 900);
}

function showPaymentMethods() {
    const about = document.getElementById('about');
    const payment = document.getElementById('payment');
    about.classList.remove('active');
    about.classList.add('hidden');
    setTimeout(() => {
        payment.classList.remove('hidden');
        payment.classList.add('active');
    }, 900);
}

function showPanelForm() {
    const about = document.getElementById('about');
    const panelForm = document.getElementById('panel-form');
    about.classList.remove('active');
    about.classList.add('hidden');
    setTimeout(() => {
        panelForm.classList.remove('hidden');
        panelForm.classList.add('active');
    }, 900);
}

function showPaymentConfirm(transactionData) {
    const panelForm = document.getElementById('panel-form');
    const paymentConfirm = document.getElementById('payment-confirm');
    
    // Update UI dengan data transaksi
    document.getElementById('transactionId').textContent = transactionData.id;
    document.getElementById('panelTypeDisplay').textContent = transactionData.panelType === 'private' ? 'Private' : 'Public';
    document.getElementById('ramDisplay').textContent = transactionData.ram.toUpperCase();
    document.getElementById('usernameDisplay').textContent = transactionData.username;
    document.getElementById('totalAmount').textContent = formatCurrency(transactionData.total);
    document.getElementById('paymentQrisImage').src = transactionData.qrImageUrl;
    
    panelForm.classList.remove('active');
    panelForm.classList.add('hidden');
    setTimeout(() => {
        paymentConfirm.classList.remove('hidden');
        paymentConfirm.classList.add('active');
    }, 900);
}

async function processOrder() {
    // Validasi form
    const username = document.getElementById('username').value.trim();
    const phone = document.getElementById('phone').value.replace(/[^0-9]/g, '');
    const panelType = document.querySelector('input[name="panelType"]:checked').value;
    const ram = document.querySelector('input[name="ram"]:checked').value;

    if (!/^[a-z0-9_]+$/.test(username)) {
        showNotification('Username hanya boleh mengandung huruf kecil, angka, dan underscore (_)', 'error');
        return;
    }

    if (username.length < 3 || username.length > 16) {
        showNotification('Username harus antara 3-16 karakter', 'error');
        return;
    }

    if (!phone.startsWith('62')) {
        showNotification('Nomor WhatsApp harus dimulai dengan 62', 'error');
        return;
    }

    // Hitung total harga
    const basePrice = panelType === 'private' ? 15000 : 10000;
    const ramPrices = {
        '1gb': 1000,
        '2gb': 2000,
        '4gb': 4000,
        '8gb': 8000,
        '10gb': 10000,
        'unli': 15000
    };
    const ramPrice = ramPrices[ram] || 0;
    const total = basePrice + ramPrice;

    // Buat data transaksi
    const transactionData = {
        username,
        phone,
        panelType,
        ram,
        total
    };

    try {
        showNotification('Memproses pesanan Anda...', 'warning');

        // Buat QRIS
        const paymentResponse = await fetch(`${global.webapi}/api/orkut/createpayment?amount=${total}&codeqr=${global.qrisOrderKuota}&apikey=${global.restapi}`);
        
        if (!paymentResponse.ok) {
            throw new Error('Gagal membuat pembayaran');
        }
        
        const paymentData = await paymentResponse.json();
        
        if (!paymentData.result) {
            throw new Error('Respons pembayaran tidak valid');
        }

        const transactionData = {
            username,
            phone,
            panelType,
            ram,
            total,
            qrImageUrl: paymentData.result.qrImageUrl,
            id: paymentData.result.transactionId,
            expiry: Date.now() + 300000 // 5 menit
        };

        currentTransaction = transactionData;
        showPaymentConfirm(transactionData);
        startPaymentCheck();
        
        showNotification('Silahkan selesaikan pembayaran', 'success');

    } catch (error) {
        console.error('Error:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

async function generateQRIS(amount) {
    try {
        // Panggil API pembayaran
        const response = await fetch(`${global.webapi}/api/orkut/createpayment?amount=${amount}&codeqr=${global.qrisOrderKuota}&apikey=${global.restapi}`);
        
        if (!response.ok) {
            throw new Error('Gagal membuat QRIS');
        }
        
        const data = await response.json();
        
        if (!data.result) {
            throw new Error('Respons API tidak valid');
        }
        
        return data.result.qrImageUrl; // Asumsi API mengembalikan URL gambar QRIS
        
    } catch (error) {
        console.error('Error generating QRIS:', error);
        throw error;
    }
}

// Fungsi untuk memulai pengecekan pembayaran
function startPaymentCheck() {
    if (paymentCheckInterval) {
        clearInterval(paymentCheckInterval);
    }

    paymentCheckInterval = setInterval(async () => {
        if (!currentTransaction) return;

        // Cek apakah pembayaran sudah expired
        if (Date.now() > currentTransaction.expiry) {
            clearInterval(paymentCheckInterval);
            showNotification('Pembayaran telah kadaluarsa', 'error');
            currentTransaction = null;
            return;
        }

        // Dalam implementasi nyata, ini akan memanggil API untuk cek status pembayaran
        const isPaid = await checkPaymentStatus(currentTransaction.id);

        if (isPaid) {
            clearInterval(paymentCheckInterval);
            showNotification('Pembayaran berhasil diterima!', 'success');
            
            // Proses pembuatan panel
            try {
                await createPanelAccount(currentTransaction);
                showNotification('Panel Anda berhasil dibuat!', 'success');
                currentTransaction = null;
                showAbout();
            } catch (error) {
                console.error('Error creating panel:', error);
                showNotification('Gagal membuat panel. Silahkan hubungi admin.', 'error');
            }
        }
    }, 5000); // Cek setiap 5 detik
}

// Fungsi untuk cek status pembayaran (simulasi)
async function checkPaymentStatus(transactionId) {
    try {
        const response = await fetch(`${global.webapi}/api/orkut/cekstatus?merchant=${global.merchantIdOrderKuota}&keyorkut=${global.apiOrderKuota}&apikey=${global.restapi}`);
        
        if (!response.ok) {
            throw new Error('Gagal memeriksa status pembayaran');
        }
        
        const data = await response.json();
        
        // Sesuaikan dengan struktur respons API Anda
        return data.status === 'paid'; // Asumsi API mengembalikan status pembayaran
        
    } catch (error) {
        console.error('Error checking payment status:', error);
        return false;
    }
}

// Fungsi untuk membuat akun panel (simulasi)
async function createPanelAccount(transactionData) {
    try {
        // 1. Buat user di Pterodactyl
        const userResponse = await fetch(`${API_CONFIG.domain}/api/application/users`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_CONFIG.apiKeyPterodactyl}`
            },
            body: JSON.stringify({
                email: `${transactionData.username}@gmail.com`,
                username: transactionData.username.toLowerCase(),
                first_name: `${transactionData.username} Server`,
                last_name: 'Customer',
                password: generatePassword()
            })
        });

        if (!userResponse.ok) {
            throw new Error('Gagal membuat user');
        }

        const userData = await userResponse.json();
        const userId = userData.attributes.id;

        // 2. Buat server
        const serverResponse = await fetch(`${API_CONFIG.domain}/api/application/servers`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_CONFIG.apiKeyPterodactyl}`
            },
            body: JSON.stringify({
                name: `${transactionData.username} Server`,
                user: userId,
                egg: API_CONFIG.eggId,
                docker_image: 'ghcr.io/parkervcp/yolks:nodejs_18',
                startup: 'npm start',
                environment: {
                    INST: "npm",
                    USER_UPLOAD: "0",
                    AUTO_UPDATE: "0",
                    CMD_RUN: "npm start"
                },
                limits: {
                    memory: getRamAllocation(transactionData.ram),
                    swap: 0,
                    disk: getDiskAllocation(transactionData.ram),
                    io: 500,
                    cpu: getCpuAllocation(transactionData.ram)
                },
                feature_limits: {
                    databases: 5,
                    backups: 5,
                    allocations: 5
                },
                deploy: {
                    locations: [API_CONFIG.locationId],
                    dedicated_ip: false
                }
            })
        });

        if (!serverResponse.ok) {
            throw new Error('Gagal membuat server');
        }

        return true;

    } catch (error) {
        console.error('Error creating panel account:', error);
        throw error;
    }
}

// Fungsi helper
function generatePassword() {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function getRamAllocation(ram) {
    const allocations = {
        '1gb': 1000,
        '2gb': 2000,
        '4gb': 4000,
        '8gb': 8000,
        '10gb': 10000,
        'unli': 0
    };
    return allocations[ram] || 1000;
}

function getDiskAllocation(ram) {
    // Sesuaikan dengan kebutuhan Anda
    return getRamAllocation(ram); // Contoh: disk sama dengan RAM
}

function getCpuAllocation(ram) {
    const allocations = {
        '1gb': 40,
        '2gb': 60,
        '4gb': 100,
        '8gb': 180,
        '10gb': 220,
        'unli': 0
    };
    return allocations[ram] || 40;
}

// Fungsi untuk membatalkan pembayaran
function cancelPayment() {
    if (paymentCheckInterval) {
        clearInterval(paymentCheckInterval);
    }
    currentTransaction = null;
    showNotification('Pembayaran dibatalkan', 'warning');
    showPanelForm();
}

// Fungsi untuk manual cek pembayaran
function checkPayment() {
    if (!currentTransaction) {
        showNotification('Tidak ada transaksi aktif', 'error');
        return;
    }
    showNotification('Memeriksa status pembayaran...', 'warning');
}

// Fungsi untuk zoom QR
function zoomQR() {
    const qrImage = document.getElementById('paymentQrisImage').src;
    const overlay = document.getElementById('qrOverlay');
    document.getElementById('zoomedQR').src = qrImage;
    overlay.classList.add('active');
}

// Fungsi untuk close zoom QR
function closeZoom() {
    const overlay = document.getElementById('qrOverlay');
    overlay.classList.remove('active');
}

// Fungsi untuk menampilkan notifikasi
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Fungsi untuk format currency
function formatCurrency(amount) {
    return 'Rp' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Fungsi untuk validasi username
function validateUsername(username) {
    return /^[a-z0-9_]+$/.test(username) && username.length >= 3 && username.length <= 16;
}