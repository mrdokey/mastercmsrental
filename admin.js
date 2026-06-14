// CONFIG UTAMA DASHBOARD ADMIN (LEWAT REVERSE PROXY NGINX HTTPS SECURE)
const BASE_API_URL = "https://wa.mrdsolution.my.id/cms-api";

let tenantId = "";
let apiKey = "";

// KOORDINAT INTEGRASI CLOUDINARY UNTUK INLINE UPLOADER
const CLOUDINARY_CLOUD_NAME = "dnobafum2";
const CLOUDINARY_PRESET = "cms_rental";

let activeInlineTargetId = "";

window.onload = function() {
    const savedTenant = localStorage.getItem('cms_tenant_id');
    const savedToken = localStorage.getItem('cms_api_key');

    if (savedTenant && savedToken) {
        tenantId = savedTenant;
        apiKey = savedToken;
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
        document.getElementById('currentTenantName').innerText = tenantId;
        loadSettings();
    }
}

async function handleLogin() {
    const tInput = document.getElementById('loginTenant').value.trim();
    const tokenInput = document.getElementById('loginToken').value.trim();

    if (!tInput || !tokenInput) {
        Swal.fire('Galat', 'Lengkapi seluruh formulir login.', 'warning');
        return;
    }

    Swal.fire({ title: 'Memverifikasi...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res = await fetch(`${BASE_API_URL}/api/auth/verify`, {
            method: 'GET',
            headers: {
                'X-Tenant-ID': tInput,
                'x-api-key': tokenInput
            }
        });
        const data = await res.json();

        if (data.status === "success") {
            tenantId = tInput;
            apiKey = tokenInput;
            localStorage.setItem('cms_tenant_id', tenantId);
            localStorage.setItem('cms_api_key', apiKey);

            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('dashboardSection').classList.remove('hidden');
            document.getElementById('currentTenantName').innerText = tenantId;

            Swal.fire('Berhasil', 'Login Dashboard Sukses!', 'success');
            loadSettings();
        } else {
            Swal.fire('Gagal', 'Token admin salah.', 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'Gagal menghubungkan ke VPS melalui HTTPS SSL Nginx.', 'error');
    }
}

async function loadSettings() {
    try {
        const res = await fetch(`${BASE_API_URL}/api/init`, {
            headers: { 'X-Tenant-ID': tenantId }
        });
        const data = await res.json();
        if (data.status === "success") {
            const settings = data.settings;
            
            const form = document.getElementById('settingsForm');
            form.site_name.value = settings.site_name || "";
            form.tagline.value = settings.tagline || "";
            form.logo_url.value = settings.logo_url || "";
            form.favicon_url.value = settings.favicon_url || "";
            form.whatsapp_number.value = settings.whatsapp_number || "";
            form.gas_url.value = settings.gas_url || "";
            form.address.value = settings.address || "";
            form.google_maps_embed.value = settings.google_maps_embed || "";

            // Isi nilai input token admin kustom
            document.getElementById('adminTokenField').value = settings.admin_token || apiKey;

            // Isi nilai input form Tema Warna
            document.getElementById('primaryHexText').value = settings.primary_color || "#FFD700";
            document.getElementById('secondaryHexText').value = settings.secondary_color || "#3E2723";
            document.getElementById('bgHexText').value = settings.bg_color || "#fdfaf5";
            document.getElementById('textHexText').value = settings.text_color || "#2C1B18";
            
            // Isi nilai input Instagram
            document.getElementById('instagramActiveField').value = settings.instagram_active || "0";
            document.getElementById('instagramUserField').value = settings.instagram_username || "";

            // Tampilkan Pratinjau Gambar Dinamis (Jika URL tersedia)
            updateImagePreview('logoUrlField', settings.logo_url);
            updateImagePreview('faviconUrlField', settings.favicon_url);

            syncColorPickers();
        }
    } catch (err) {
        console.error("Gagal sinkronisasi data VPS.", err);
    }
}

// FUNGSI AKTIVATOR DIALOG FILE SELECTOR
function triggerInlineUpload(targetFieldId) {
    activeInlineTargetId = targetFieldId;
    document.getElementById('inlineCloudinaryFile').click();
}

// SMART INLINE IMAGE UPLOADER HANDLER (DIRECT CLOUDINARY UNSIGNED UPLOAD API)
async function handleInlineImageUpload() {
    const fileInput = document.getElementById('inlineCloudinaryFile');
    if (!fileInput.files || fileInput.files.length === 0) return;

    const file = fileInput.files[0];

    Swal.fire({
        title: 'Mengunggah Gambar...',
        text: 'Mengirim file gambar langsung ke CDN Cloudinary.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);

    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        Swal.close();

        if (data.secure_url) {
            const targetField = document.getElementById(activeInlineTargetId);
            targetField.value = data.secure_url;

            updateImagePreview(activeInlineTargetId, data.secure_url);

            Swal.fire({
                title: 'Berhasil di-upload!',
                text: 'URL gambar telah disuntikkan secara dinamis.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            Swal.fire('Gagal', 'Terjadi kesalahan pemrosesan Cloudinary.', 'error');
        }
    } catch (err) {
        Swal.close();
        Swal.fire('Error', 'Gagal menghubungkan ke server Cloudinary API.', 'error');
    }

    fileInput.value = "";
}

function updateImagePreview(fieldId, url) {
    const previewImg = document.getElementById(`${fieldId}-preview`);
    const previewContainer = document.getElementById(`${fieldId}-preview-container`);
    
    if (url && url.startsWith('http')) {
        previewImg.src = url;
        previewContainer.classList.remove('hidden');
    } else {
        previewContainer.classList.add('hidden');
    }
}

const pickerMap = [
    { picker: 'primaryColorInput', text: 'primaryHexText' },
    { picker: 'secondaryColorInput', text: 'secondaryHexText' },
    { picker: 'bgColorInput', text: 'bgHexText' },
    { picker: 'textColorInput', text: 'textHexText' }
];

pickerMap.forEach(el => {
    const p = document.getElementById(el.picker);
    const t = document.getElementById(el.text);
    p.addEventListener('input', () => t.value = p.value.toUpperCase());
    t.addEventListener('input', () => p.value = t.value);
});

function syncColorPickers() {
    pickerMap.forEach(el => {
        document.getElementById(el.picker).value = document.getElementById(el.text).value;
    });
}

function applyPreset(p, s, b, t) {
    document.getElementById('primaryHexText').value = p;
    document.getElementById('secondaryHexText').value = s;
    document.getElementById('bgHexText').value = b;
    document.getElementById('textHexText').value = t;
    syncColorPickers();
    Swal.fire({ title: 'Preset Diisi!', text: 'Klik "Terapkan Palet Warna" untuk menyimpan.', icon: 'info', timer: 1500, showConfirmButton: false });
}

async function saveSettings() {
    const form = document.getElementById('settingsForm');
    const newTokenValue = document.getElementById('adminTokenField').value.trim();

    const payload = [
        { key: 'site_name', value: form.site_name.value },
        { key: 'tagline', value: form.tagline.value },
        { key: 'logo_url', value: form.logo_url.value },
        { key: 'favicon_url', value: form.favicon_url.value },
        { key: 'whatsapp_number', value: form.whatsapp_number.value },
        { key: 'gas_url', value: form.gas_url.value },
        { key: 'admin_token', value: newTokenValue },
        { key: 'address', value: form.address.value },
        { key: 'google_maps_embed', value: form.google_maps_embed.value }
    ];

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res = await fetch(`${BASE_API_URL}/api/settings/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': tenantId,
                'x-api-key': apiKey
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status === "success") {
            if (newTokenValue !== apiKey) {
                apiKey = newTokenValue;
                localStorage.setItem('cms_api_key', apiKey);
            }
            
            Swal.fire('Berhasil', 'Konfigurasi website berhasil disimpan!', 'success');
            loadSettings();
        }
    } catch (err) {
        Swal.fire('Error', 'Gagal mengupdate database VPS.', 'error');
    }
}

async function saveTheme() {
    const form = document.getElementById('themeForm');
    const payload = [
        { key: 'primary_color', value: form.primary_color.value },
        { key: 'secondary_color', value: form.secondary_color.value },
        { key: 'bg_color', value: form.bg_color.value },
        { key: 'text_color', value: form.text_color.value }
    ];

    Swal.fire({ title: 'Menyimpan Tema...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res = await fetch(`${BASE_API_URL}/api/settings/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': tenantId,
                'x-api-key': apiKey
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status === "success") {
            Swal.fire('Berhasil', 'Skema warna tema berhasil diterapkan!', 'success');
            loadSettings();
        }
    } catch (err) {
        Swal.fire('Error', 'Gagal memproses data ke server.', 'error');
    }
}

async function saveInstagram() {
    const payload = [
        { key: 'instagram_active', value: document.getElementById('instagramActiveField').value },
        { key: 'instagram_username', value: document.getElementById('instagramUserField').value.trim() }
    ];

    Swal.fire({ title: 'Menyimpan Instagram...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res = await fetch(`${BASE_API_URL}/api/settings/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': tenantId,
                'x-api-key': apiKey
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status === "success") {
            Swal.fire('Berhasil', 'Pengaturan widget Instagram berhasil disimpan!', 'success');
            loadSettings();
        }
    } catch (err) {
        Swal.fire('Error', 'Gagal memproses pengaturan Instagram.', 'error');
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('bg-indigo-800'));
    
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    event.currentTarget.classList.add('bg-indigo-800');
}

function logout() {
    localStorage.clear();
    location.reload();
}