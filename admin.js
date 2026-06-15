const BASE_API_URL = "https://wa.mrdsolution.my.id/cms-api";

let tenantId = "";
let apiKey = "";

// CREDENTIALS INTEGRASI CLOUDINARY UNTUK INLINE UPLOADER
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

// ------------------------------------------------------------
// MUAT SELURUH DATA DARI DATABASE MYSQL KLIEN
// ------------------------------------------------------------
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

            // SINKRONISASI NILAI STATUS SAKELAR CARI UNIT (1 / 0)
            document.getElementById('cariUnitActiveField').value = settings.cari_unit_active || "1";

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

// FUNGSI UTILITY INLINE FILE SELECTOR
function triggerInlineUpload(targetFieldId) {
    activeInlineTargetId = targetFieldId;
    document.getElementById('inlineCloudinaryFile').click();
}

// CORE INLINE IMAGE UPLOADER HANDLER (DIRECT CLOUDINARY UNSIGNED UPLOAD API)
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
            // Jika dipanggil dari tombol inline modal, isi nilai modal
            if (activeInlineTargetId.startsWith("modal-")) {
                const targetInput = document.getElementById(activeInlineTargetId);
                if (targetInput) {
                    targetInput.value = data.secure_url;
                    // Tampilkan pratinjau di dalam modal jika ada
                    const modalPreview = document.getElementById(activeInlineTargetId + "-preview");
                    if (modalPreview) modalPreview.src = data.secure_url;
                }
            } else {
                // Sebaliknya isi kolom input pengaturan utama
                const targetField = document.getElementById(activeInlineTargetId);
                targetField.value = data.secure_url;
                updateImagePreview(activeInlineTargetId, data.secure_url);
            }

            Swal.fire({
                title: 'Berhasil di-upload!',
                text: 'Gambar CDN Cloudinary siap digunakan.',
                icon: 'success',
                timer: 1200,
                showConfirmButton: false
            });
        } else {
            Swal.fire('Gagal', 'Terjadi kesalahan pemrosesan Cloudinary.', 'error');
        }
    } catch (err) {
        Swal.close();
        Swal.fire('Error', 'Gagal terhubung ke server Cloudinary API.', 'error');
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

// ------------------------------------------------------------
// INTEGRASI MANAJEMEN TEMA WARNA & PICKER
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// AKSI SIMPAN FORM CONFIG UTAMA
// ------------------------------------------------------------
async function saveSettings() {
    const form = document.getElementById('settingsForm');
    const newTokenValue = document.getElementById('adminTokenField').value.trim();
    const cariUnitActiveValue = document.getElementById('cariUnitActiveField').value;

    const payload = [
        { key: 'site_name', value: form.site_name.value },
        { key: 'tagline', value: form.tagline.value },
        { key: 'logo_url', value: form.logo_url.value },
        { key: 'favicon_url', value: form.favicon_url.value },
        { key: 'whatsapp_number', value: form.whatsapp_number.value },
        { key: 'gas_url', value: form.gas_url.value },
        { key: 'cari_unit_active', value: cariUnitActiveValue },
        { key: 'admin_token', value: newTokenValue },
        { key: 'address', value: form.address.value },
        { key: 'google_maps_embed', value: form.google_maps_embed.value }
    ];

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res = await fetch(`${API_BASE_URL}/api/settings/update`, {
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
        const res = await fetch(`${API_BASE_URL}/api/settings/update`, {
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
        const res = await fetch(`${API_BASE_URL}/api/settings/update`, {
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

// ------------------------------------------------------------
// CORE CRUD 1: MANAJEMEN MENU NAVIGASI WEBSITE
// ------------------------------------------------------------
async function loadNavigationTable() {
    try {
        const res = await fetch(`${BASE_API_URL}/api/navigation`, {
            headers: { 'X-Tenant-ID': tenantId }
        });
        const json = await res.json();
        const container = document.getElementById('navigationTableBody');
        container.innerHTML = "";

        if (json.status === "success" && json.data.length > 0) {
            json.data.forEach(item => {
                container.innerHTML += `
                    <tr class="bg-white border-b hover:bg-gray-50">
                        <td class="px-6 py-4 font-bold text-gray-900">${item.title_id}</td>
                        <td class="px-6 py-4 font-bold text-gray-900">${item.title_en}</td>
                        <td class="px-6 py-4 font-mono text-xs text-indigo-600">${item.target_url}</td>
                        <td class="px-6 py-4">${item.order_num}</td>
                        <td class="px-6 py-4">
                            <span class="px-2 py-1 text-xs font-bold rounded-full ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                ${item.is_active ? 'Aktif' : 'Nonaktif'}
                            </span>
                        </td>
                        <td class="px-6 py-4 text-center space-x-2">
                            <button onclick="editNavigation(${JSON.stringify(item).replace(/"/g, '&quot;')})" class="text-indigo-600 hover:text-indigo-900 font-bold"><i class="fas fa-edit"></i></button>
                            <button onclick="deleteNavigation(${item.id})" class="text-red-600 hover:text-red-900 font-bold"><i class="fas fa-trash-alt"></i></button>
                        </td>
                    </tr>`;
            });
        } else {
            container.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-gray-400">Tidak ada menu navigasi kustom.</td></tr>`;
        }
    } catch (err) {
        console.error("Gagal memuat tabel navigasi.", err);
    }
}

async function openNavigationModal() {
    const { value: formValues } = await Swal.fire({
        title: 'Tambah/Edit Menu Navigasi',
        html: `
            <input id="nav-id" type="hidden">
            <div class="space-y-3 text-left">
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Nama Menu (Bahasa Indonesia)</label>
                    <input id="nav-title-id" class="swal2-input w-full m-0 rounded-xl" placeholder="Syarat Sewa">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Nama Menu (English Version)</label>
                    <input id="nav-title-en" class="swal2-input w-full m-0 rounded-xl" placeholder="Rental Terms">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Target Tautan URL (Contoh: #armada atau page.html)</label>
                    <input id="nav-target" class="swal2-input w-full m-0 rounded-xl font-mono text-sm" placeholder="tos.html">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Nomor Urutan Tampilan (1, 2, 3)</label>
                    <input id="nav-order" type="number" class="swal2-input w-full m-0 rounded-xl" value="0">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Status Keaktifan</label>
                    <select id="nav-active" class="swal2-input w-full m-0 rounded-xl">
                        <option value="1">Aktif - Tampilkan</option>
                        <option value="0">Nonaktif - Sembunyikan</option>
                    </select>
                </div>
            </div>`,
        focusConfirm: false,
        preConfirm: () => {
            return {
                id: document.getElementById('nav-id').value,
                title_id: document.getElementById('nav-title-id').value.trim(),
                title_en: document.getElementById('nav-title-en').value.trim(),
                target_url: document.getElementById('nav-target').value.trim(),
                order_num: document.getElementById('nav-order').value,
                is_active: document.getElementById('nav-active').value
            }
        }
    });

    if (formValues) {
        if (!formValues.title_id || !formValues.target_url) {
            Swal.fire('Gagal', 'Nama menu dan URL wajib diisi.', 'warning');
            return;
        }
        executeSaveNavigation(formValues);
    }
}

function editNavigation(item) {
    setTimeout(async () => {
        await openNavigationModal();
        document.getElementById('nav-id').value = item.id;
        document.getElementById('nav-title-id').value = item.title_id;
        document.getElementById('nav-title-en').value = item.title_en;
        document.getElementById('nav-target').value = item.target_url;
        document.getElementById('nav-order').value = item.order_num;
        document.getElementById('nav-active').value = item.is_active ? "1" : "0";
    }, 100);
}

async function executeSaveNavigation(payload) {
    try {
        const res = await fetch(`${BASE_API_URL}/api/navigation/save`, {
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
            Swal.fire('Berhasil!', 'Menu navigasi disimpan.', 'success');
            loadNavigationTable();
        }
    } catch (err) {
        Swal.fire('Error', 'Gagal memproses menu ke VPS.', 'error');
    }
}

async function deleteNavigation(id) {
    const check = await Swal.fire({
        title: 'Apakah Anda yakin?',
        text: "Menu navigasi ini akan dihapus permanen dari website.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, hapus!'
    });

    if (check.isConfirmed) {
        try {
            const res = await fetch(`${BASE_API_URL}/api/navigation/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantId,
                    'x-api-key': apiKey
                },
                body: JSON.stringify({ id })
            });
            const data = await res.json();
            if (data.status === "success") {
                Swal.fire('Terhapus!', 'Menu navigasi berhasil dihapus.', 'success');
                loadNavigationTable();
            }
        } catch (err) {
            Swal.fire('Error', 'Gagal menghapus data.', 'error');
        }
    }
}

// ------------------------------------------------------------
// CORE CRUD 2: MANAJEMEN ARTIKEL & PROMO
// ------------------------------------------------------------
async function loadPosts() {
    try {
        const res = await fetch(`${BASE_API_URL}/api/posts`, {
            headers: { 'X-Tenant-ID': tenantId }
        });
        const json = await res.json();
        const container = document.getElementById('postsGridContainer');
        container.innerHTML = "";

        if (json.status === "success" && json.data.length > 0) {
            json.data.forEach(item => {
                container.innerHTML += `
                    <div class="bg-gray-50 border p-5 rounded-2xl flex flex-col justify-between shadow-sm">
                        <div>
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-xs font-bold uppercase text-indigo-600 font-mono">${item.status}</span>
                                <span class="text-xs text-gray-400">${new Date(item.published_at).toLocaleDateString()}</span>
                            </div>
                            <h4 class="text-md font-bold text-gray-900 mb-1">${item.title}</h4>
                            <p class="text-xs font-semibold text-gray-400 font-mono mb-3">Slug: /posts/${item.slug}</p>
                            <div class="text-xs text-gray-500 line-clamp-3">${item.content.replace(/<[^>]*>/g, '')}</div>
                        </div>
                        <div class="flex justify-end gap-3 mt-4 border-t pt-3">
                            <button onclick="editPost(${JSON.stringify(item).replace(/"/g, '&quot;')})" class="text-indigo-600 hover:text-indigo-900 text-xs font-bold"><i class="fas fa-edit"></i> Edit</button>
                            <button onclick="deletePost(${item.id})" class="text-red-600 hover:text-red-900 text-xs font-bold"><i class="fas fa-trash-alt"></i> Hapus</button>
                        </div>
                    </div>`;
            });
        } else {
            container.innerHTML = `<div class="col-span-2 text-center py-10 text-gray-400 font-semibold">Belum ada artikel atau promo yang diterbitkan.</div>`;
        }
    } catch (err) {
        console.error("Gagal mengambil data artikel.", err);
    }
}

async function openPostModal() {
    const { value: formValues } = await Swal.fire({
        title: 'Buat/Edit Artikel Promo',
        html: `
            <input id="post-id" type="hidden">
            <div class="space-y-3 text-left">
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Judul Artikel</label>
                    <input id="post-title" class="swal2-input w-full m-0 rounded-xl" placeholder="Promo Hemat Sewa Vespa 3 Hari">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Slug URL Ramah SEO (Gunakan Tanda Strip)</label>
                    <input id="post-slug" class="swal2-input w-full m-0 rounded-xl font-mono text-sm" placeholder="promo-hemat-vespa">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Konten / Isi Pengumuman</label>
                    <textarea id="post-content" class="swal2-textarea w-full m-0 rounded-xl border border-gray-200 p-3 h-32" placeholder="Tulis isi pengumuman/promo di sini..."></textarea>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Status Publikasi</label>
                    <select id="post-status" class="swal2-input w-full m-0 rounded-xl">
                        <option value="Published">Diterbitkan (Published)</option>
                        <option value="Draft">Simpan Sebagai Draft (Draft)</option>
                    </select>
                </div>
            </div>`,
        focusConfirm: false,
        preConfirm: () => {
            return {
                id: document.getElementById('post-id').value,
                title: document.getElementById('post-title').value.trim(),
                slug: document.getElementById('post-slug').value.trim(),
                content: document.getElementById('post-content').value.trim(),
                status: document.getElementById('post-status').value
            }
        }
    });

    if (formValues) {
        if (!formValues.title || !formValues.slug || !formValues.content) {
            Swal.fire('Gagal', 'Lengkapi seluruh isi artikel.', 'warning');
            return;
        }
        executeSavePost(formValues);
    }
}

function editPost(item) {
    setTimeout(async () => {
        await openPostModal();
        document.getElementById('post-id').value = item.id;
        document.getElementById('post-title').value = item.title;
        document.getElementById('post-slug').value = item.slug;
        document.getElementById('post-content').value = item.content;
        document.getElementById('post-status').value = item.status;
    }, 100);
}

async function executeSavePost(payload) {
    try {
        const res = await fetch(`${BASE_API_URL}/api/posts/save`, {
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
            Swal.fire('Berhasil!', 'Artikel berhasil diterbitkan.', 'success');
            loadPosts();
        }
    } catch (err) {
        Swal.fire('Error', 'Gagal memproses data artikel.', 'error');
    }
}

async function deletePost(id) {
    const check = await Swal.fire({
        title: 'Hapus Artikel?',
        text: "Artikel ini akan hilang permanen dari database.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, hapus!'
    });

    if (check.isConfirmed) {
        try {
            const res = await fetch(`${BASE_API_URL}/api/posts/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantId,
                    'x-api-key': apiKey
                },
                body: JSON.stringify({ id })
            });
            const data = await res.json();
            if (data.status === "success") {
                Swal.fire('Sukses', 'Artikel berhasil dihapus.', 'success');
                loadPosts();
            }
        } catch (err) {
            Swal.fire('Error', 'Gagal memproses hapus.', 'error');
        }
    }
}

// ------------------------------------------------------------
// CORE CRUD 3: MANAJEMEN HALAMAN KUSTOM
// ------------------------------------------------------------
async function loadPages() {
    try {
        const res = await fetch(`${BASE_API_URL}/api/pages`, {
            headers: { 'X-Tenant-ID': tenantId }
        });
        const json = await res.json();
        const container = document.getElementById('pagesTableBody');
        container.innerHTML = "";

        if (json.status === "success" && json.data.length > 0) {
            json.data.forEach(item => {
                container.innerHTML += `
                    <tr class="bg-white border-b hover:bg-gray-50">
                        <td class="px-6 py-4 font-bold text-gray-900">${item.title}</td>
                        <td class="px-6 py-4 font-mono text-xs text-indigo-600">/pages/${item.slug}</td>
                        <td class="px-6 py-4 text-center space-x-2">
                            <button onclick="editPage(${JSON.stringify(item).replace(/"/g, '&quot;')})" class="text-indigo-600 hover:text-indigo-900 font-bold"><i class="fas fa-edit"></i> Edit</button>
                            <button onclick="deletePage(${item.id})" class="text-red-600 hover:text-red-900 font-bold"><i class="fas fa-trash-alt"></i> Hapus</button>
                        </td>
                    </tr>`;
            });
        } else {
            container.innerHTML = `<tr><td colspan="3" class="text-center py-6 text-gray-400">Belum ada halaman kustom (ToS/FAQ) dibuat.</td></tr>`;
        }
    } catch (err) {
        console.error("Gagal mengambil data halaman.", err);
    }
}

async function openPageModal() {
    const { value: formValues } = await Swal.fire({
        title: 'Buat/Edit Halaman Kustom',
        html: `
            <input id="page-id" type="hidden">
            <div class="space-y-3 text-left">
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Judul Halaman</label>
                    <input id="page-title" class="swal2-input w-full m-0 rounded-xl" placeholder="Syarat & Ketentuan Sewa Motor">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Slug URL Halaman (Tanpa Spasi)</label>
                    <input id="page-slug" class="swal2-input w-full m-0 rounded-xl font-mono text-sm" placeholder="syarat-dan-ketentuan">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Konten Halaman (HTML/Plain Text)</label>
                    <textarea id="page-content" class="swal2-textarea w-full m-0 rounded-xl border border-gray-200 p-3 h-48 font-mono text-sm" placeholder="<p>Tulis markup halaman di sini...</p>"></textarea>
                </div>
            </div>`,
        focusConfirm: false,
        preConfirm: () => {
            return {
                id: document.getElementById('page-id').value,
                title: document.getElementById('page-title').value.trim(),
                slug: document.getElementById('page-slug').value.trim(),
                content: document.getElementById('page-content').value.trim()
            }
        }
    });

    if (formValues) {
        if (!formValues.title || !formValues.slug || !formValues.content) {
            Swal.fire('Gagal', 'Semua kolom input wajib diisi.', 'warning');
            return;
        }
        executeSavePage(formValues);
    }
}

function editPage(item) {
    setTimeout(async () => {
        await openPageModal();
        document.getElementById('page-id').value = item.id;
        document.getElementById('page-title').value = item.title;
        document.getElementById('page-slug').value = item.slug;
        document.getElementById('page-content').value = item.content;
    }, 100);
}

async function executeSavePage(payload) {
    try {
        const res = await fetch(`${BASE_API_URL}/api/pages/save`, {
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
            Swal.fire('Berhasil!', 'Halaman kustom berhasil disimpan.', 'success');
            loadPages();
        }
    } catch (err) {
        Swal.fire('Error', 'Gagal memproses halaman kustom ke VPS.', 'error');
    }
}

async function deletePage(id) {
    const check = await Swal.fire({
        title: 'Hapus Halaman?',
        text: "Halaman ini akan hilang secara permanen dari server.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, hapus!'
    });

    if (check.isConfirmed) {
        try {
            const res = await fetch(`${BASE_API_URL}/api/pages/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantId,
                    'x-api-key': apiKey
                },
                body: JSON.stringify({ id })
            });
            const data = await res.json();
            if (data.status === "success") {
                Swal.fire('Sukses', 'Halaman kustom berhasil dihapus.', 'success');
                loadPages();
            }
        } catch (err) {
            Swal.fire('Error', 'Gagal memproses hapus.', 'error');
        }
    }
}

// ------------------------------------------------------------
// CORE CRUD 4: MANAJEMEN TESTIMONI PELANGGAN
// ------------------------------------------------------------
async function loadTestimonials() {
    try {
        const res = await fetch(`${BASE_API_URL}/api/testimonials`, {
            headers: { 'X-Tenant-ID': tenantId }
        });
        const json = await res.json();
        const container = document.getElementById('testimonialsGridContainer');
        container.innerHTML = "";

        if (json.status === "success" && json.data.length > 0) {
            json.data.forEach(item => {
                let stars = "";
                for (let s = 1; s <= 5; s++) {
                    stars += `<i class="fa${s <= item.rating ? 's' : 'r'} fa-star text-yellow-400"></i>`;
                }

                container.innerHTML += `
                    <div class="bg-gray-50 border p-5 rounded-3xl flex gap-4 shadow-sm relative">
                        <img class="w-12 h-12 rounded-full border object-cover" src="${item.customer_avatar || 'https://placehold.co/100/3E2723/ffffff?text=U'}" alt="Avatar">
                        <div class="flex-1">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h4 class="text-sm font-bold text-gray-900">${item.customer_name}</h4>
                                    <div class="flex gap-0.5 mt-0.5">${stars}</div>
                                </div>
                                <span class="text-xs px-2 py-0.5 rounded-full ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} font-bold">
                                    ${item.is_active ? 'Aktif' : 'Sembunyi'}
                                </span>
                            </div>
                            <p class="text-xs text-gray-600 mt-3 font-semibold">ID: "${item.comment_id}"</p>
                            <p class="text-xs text-gray-400 mt-1 font-semibold italic">EN: "${item.comment_en}"</p>
                            
                            <div class="flex justify-end gap-3 mt-4 border-t pt-3">
                                <button onclick="editTestimonial(${JSON.stringify(item).replace(/"/g, '&quot;')})" class="text-indigo-600 hover:text-indigo-900 text-xs font-bold"><i class="fas fa-edit"></i> Edit</button>
                                <button onclick="deleteTestimonial(${item.id})" class="text-red-600 hover:text-red-900 text-xs font-bold"><i class="fas fa-trash-alt"></i> Hapus</button>
                            </div>
                        </div>
                    </div>`;
            });
        } else {
            container.innerHTML = `<div class="col-span-2 text-center py-10 text-gray-400 font-semibold">Belum ada ulasan testimoni pelanggan.</div>`;
        }
    } catch (err) {
        console.error("Gagal mengambil data testimoni.", err);
    }
}

async function openTestimonialModal() {
    const { value: formValues } = await Swal.fire({
        title: 'Tambah/Edit Ulasan Pelanggan',
        html: `
            <input id="testi-id" type="hidden">
            <div class="space-y-3 text-left">
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Nama Lengkap Pelanggan</label>
                    <input id="testi-name" class="swal2-input w-full m-0 rounded-xl" placeholder="John Doe">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Link Foto Pelanggan (Avatar URL)</label>
                    <div class="flex gap-2">
                        <input id="modal-testi-avatar" class="swal2-input flex-1 m-0 rounded-xl text-xs font-mono" placeholder="https://...">
                        <button type="button" onclick="triggerInlineUpload('modal-testi-avatar')" class="bg-indigo-600 text-white font-bold px-3 rounded-xl text-xs">Upload</button>
                    </div>
                    <div class="mt-2 text-center">
                        <img id="modal-testi-avatar-preview" class="w-10 h-10 rounded-full border object-cover mx-auto" src="https://placehold.co/100/3E2723/ffffff?text=U">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Jumlah Bintang (Rating 1 - 5)</label>
                    <select id="testi-rating" class="swal2-input w-full m-0 rounded-xl">
                        <option value="5">★★★★★ - Sangat Puas</option>
                        <option value="4">★★★★☆ - Puas</option>
                        <option value="3">★★★☆☆ - Cukup</option>
                        <option value="2">★★☆☆☆ - Kurang</option>
                        <option value="1">★☆☆☆☆ - Kecewa</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Ulasan (Bahasa Indonesia)</label>
                    <textarea id="testi-comment-id" class="swal2-textarea w-full m-0 rounded-xl border p-2 h-16" placeholder="Sewa motor di sini sangat ramah dan cepat..."></textarea>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Comment (English Version)</label>
                    <textarea id="testi-comment-en" class="swal2-textarea w-full m-0 rounded-xl border p-2 h-16" placeholder="Very clean bikes and excellent customer service..."></textarea>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Status Penayangan</label>
                    <select id="testi-active" class="swal2-input w-full m-0 rounded-xl">
                        <option value="1">Aktif - Tampilkan Di Website</option>
                        <option value="0">Nonaktif - Sembunyikan</option>
                    </select>
                </div>
            </div>`,
        focusConfirm: false,
        preConfirm: () => {
            return {
                id: document.getElementById('testi-id').value,
                customer_name: document.getElementById('testi-name').value.trim(),
                customer_avatar: document.getElementById('modal-testi-avatar').value.trim(),
                rating: document.getElementById('testi-rating').value,
                comment_id: document.getElementById('testi-comment-id').value.trim(),
                comment_en: document.getElementById('testi-comment-en').value.trim(),
                is_active: document.getElementById('testi-active').value
            }
        }
    });

    if (formValues) {
        if (!formValues.customer_name || !formValues.comment_id || !formValues.comment_en) {
            Swal.fire('Gagal', 'Lengkapi kolom nama dan ulasan.', 'warning');
            return;
        }
        executeSaveTestimonial(formValues);
    }
}

function editTestimonial(item) {
    setTimeout(async () => {
        await openTestimonialModal();
        document.getElementById('testi-id').value = item.id;
        document.getElementById('testi-name').value = item.customer_name;
        document.getElementById('modal-testi-avatar').value = item.customer_avatar;
        document.getElementById('modal-testi-avatar-preview').src = item.customer_avatar || 'https://placehold.co/100/3E2723/ffffff?text=U';
        document.getElementById('testi-rating').value = item.rating;
        document.getElementById('testi-comment-id').value = item.comment_id;
        document.getElementById('testi-comment-en').value = item.comment_en;
        document.getElementById('testi-active').value = item.is_active ? "1" : "0";
    }, 100);
}

async function executeSaveTestimonial(payload) {
    try {
        const res = await fetch(`${BASE_API_URL}/api/testimonials/save`, {
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
            Swal.fire('Berhasil!', 'Testimoni ulasan disimpan.', 'success');
            loadTestimonials();
        }
    } catch (err) {
        Swal.fire('Error', 'Gagal memproses data ulasan.', 'error');
    }
}

async function deleteTestimonial(id) {
    const check = await Swal.fire({
        title: 'Hapus Testimoni?',
        text: "Ulasan terpilih akan dihapus permanen.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, hapus!'
    });

    if (check.isConfirmed) {
        try {
            const res = await fetch(`${BASE_API_URL}/api/testimonials/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantId,
                    'x-api-key': apiKey
                },
                body: JSON.stringify({ id })
            });
            const data = await res.json();
            if (data.status === "success") {
                Swal.fire('Sukses', 'Testimoni ulasan berhasil dihapus.', 'success');
                loadTestimonials();
            }
        } catch (err) {
            Swal.fire('Error', 'Gagal memproses hapus.', 'error');
        }
    }
}

// ------------------------------------------------------------
// CORE CRUD 5: MANAJEMEN GALERI ALBUM FOTO
// ------------------------------------------------------------
async function loadGalleries() {
    try {
        const res = await fetch(`${BASE_API_URL}/api/galleries`, {
            headers: { 'X-Tenant-ID': tenantId }
        });
        const json = await res.json();
        const container = document.getElementById('galleriesGridContainer');
        container.innerHTML = "";

        if (json.status === "success" && json.data.length > 0) {
            json.data.forEach(item => {
                container.innerHTML += `
                    <div class="bg-white border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition">
                        <div class="h-44 w-full bg-gray-100 overflow-hidden relative">
                            <span class="absolute top-2 left-2 px-2 py-0.5 text-xs font-bold rounded-full ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} z-10 shadow-sm">
                                ${item.is_active ? 'Aktif' : 'Disembunyikan'}
                            </span>
                            <img class="w-full h-full object-cover transition transform hover:scale-105 duration-300" src="${item.image_url}" alt="Galeri">
                        </div>
                        <div class="p-4 flex flex-col justify-between">
                            <div>
                                <h4 class="text-xs font-bold text-gray-400 uppercase font-mono">${item.album_name_id}</h4>
                                <p class="text-xs text-gray-500 mt-2 line-clamp-2">${item.caption_id || '-'}</p>
                            </div>
                            <div class="flex justify-end gap-3 mt-4 border-t pt-3">
                                <button onclick="editGallery(${JSON.stringify(item).replace(/"/g, '&quot;')})" class="text-indigo-600 hover:text-indigo-900 text-xs font-bold"><i class="fas fa-edit"></i> Edit</button>
                                <button onclick="deleteGallery(${item.id})" class="text-red-600 hover:text-red-900 text-xs font-bold"><i class="fas fa-trash-alt"></i> Hapus</button>
                            </div>
                        </div>
                    </div>`;
            });
        } else {
            container.innerHTML = `<div class="col-span-3 text-center py-10 text-gray-400 font-semibold">Album galeri foto masih kosong.</div>`;
        }
    } catch (err) {
        console.error("Gagal mengambil data galeri.", err);
    }
}

async function openGalleryModal() {
    const { value: formValues } = await Swal.fire({
        title: 'Tambah/Edit Album Galeri Foto',
        html: `
            <input id="gal-id" type="hidden">
            <div class="space-y-3 text-left">
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Nama Album (Bahasa Indonesia)</label>
                    <input id="gal-album-id" class="swal2-input w-full m-0 rounded-xl" placeholder="Dokumentasi Pelanggan">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Album Name (English Version)</label>
                    <input id="gal-album-en" class="swal2-input w-full m-0 rounded-xl" placeholder="Customer Documentation">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">File Gambar (Image CDN URL)</label>
                    <div class="flex gap-2">
                        <input id="modal-gal-image" class="swal2-input flex-1 m-0 rounded-xl text-xs font-mono" placeholder="https://...">
                        <button type="button" onclick="triggerInlineUpload('modal-gal-image')" class="bg-indigo-600 text-white font-bold px-3 rounded-xl text-xs">Upload</button>
                    </div>
                    <div class="mt-2 text-center">
                        <img id="modal-gal-image-preview" class="max-h-24 rounded border object-contain mx-auto bg-gray-50" src="https://placehold.co/200x100/3E2723/ffffff?text=Preview">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Caption / Keterangan (Bahasa Indonesia)</label>
                    <input id="gal-caption-id" class="swal2-input w-full m-0 rounded-xl" placeholder="Foto kebahagiaan pelanggan saat rental motor">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Caption / Description (English Version)</label>
                    <input id="gal-caption-en" class="swal2-input w-full m-0 rounded-xl" placeholder="Customer happiness while renting scooter">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Status Galeri</label>
                    <select id="gal-active" class="swal2-input w-full m-0 rounded-xl">
                        <option value="1">Aktif - Tampilkan Di Album</option>
                        <option value="0">Nonaktif - Sembunyikan</option>
                    </select>
                </div>
            </div>`,
        focusConfirm: false,
        preConfirm: () => {
            return {
                id: document.getElementById('gal-id').value,
                album_name_id: document.getElementById('gal-album-id').value.trim(),
                album_name_en: document.getElementById('gal-album-en').value.trim(),
                image_url: document.getElementById('modal-gal-image').value.trim(),
                caption_id: document.getElementById('gal-caption-id').value.trim(),
                caption_en: document.getElementById('gal-caption-en').value.trim(),
                is_active: document.getElementById('gal-active').value
            }
        }
    });

    if (formValues) {
        if (!formValues.album_name_id || !formValues.image_url) {
            Swal.fire('Gagal', 'Kolom nama album dan file gambar wajib diisi.', 'warning');
            return;
        }
        executeSaveGallery(formValues);
    }
}

function editGallery(item) {
    setTimeout(async () => {
        await openGalleryModal();
        document.getElementById('gal-id').value = item.id;
        document.getElementById('gal-album-id').value = item.album_name_id;
        document.getElementById('gal-album-en').value = item.album_name_en;
        document.getElementById('modal-gal-image').value = item.image_url;
        document.getElementById('modal-gal-image-preview').src = item.image_url;
        document.getElementById('gal-caption-id').value = item.caption_id || "";
        document.getElementById('gal-caption-en').value = item.caption_en || "";
        document.getElementById('gal-active').value = item.is_active ? "1" : "0";
    }, 100);
}

async function executeSaveGallery(payload) {
    try {
        const res = await fetch(`${BASE_API_URL}/api/galleries/save`, {
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
            Swal.fire('Berhasil!', 'Foto berhasil ditambahkan ke Galeri Album.', 'success');
            loadGalleries();
        }
    } catch (err) {
        Swal.fire('Error', 'Gagal memproses unggah galeri.', 'error');
    }
}

async function deleteGallery(id) {
    const check = await Swal.fire({
        title: 'Hapus Foto Ini?',
        text: "Foto akan dihapus secara permanen dari album.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, hapus!'
    });

    if (check.isConfirmed) {
        try {
            const res = await fetch(`${BASE_API_URL}/api/galleries/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantId,
                    'x-api-key': apiKey
                },
                body: JSON.stringify({ id })
            });
            const data = await res.json();
            if (data.status === "success") {
                Swal.fire('Sukses', 'Foto berhasil dihapus dari album.', 'success');
                loadGalleries();
            }
        } catch (err) {
            Swal.fire('Error', 'Gagal memproses hapus.', 'error');
        }
    }
}

// ------------------------------------------------------------
// KONTROL ALUR TABS SIDEBAR
// ------------------------------------------------------------
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('bg-indigo-800'));
    
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    event.currentTarget.classList.add('bg-indigo-800');

    // Lazy load masing-masing tabel CRUD sesuai tab yang di-klik demi performa tinggi
    if (tabId === 'navigation') loadNavigationTable();
    if (tabId === 'posts') loadPosts();
    if (tabId === 'pages') loadPages();
    if (tabId === 'testimonials') loadTestimonials();
    if (tabId === 'galleries') loadGalleries();
}

function logout() {
    localStorage.clear();
    location.reload();
}