const BASE_API_URL = "https://wa.mrdsolution.my.id/cms-api";

let tenantId = "";
let apiKey = "";

// CREDENTIALS INTEGRASI CLOUDINARY UNTUK INLINE UPLOADER
const CLOUDINARY_CLOUD_NAME = "dnobafum2";
const CLOUDINARY_PRESET = "cms_rental";

let activeInlineTargetId = "";

// STATE PENAMPUNG DATA JSON DARI DATABASE
let localNavigation = [];
let localTestimonials = [];
let localGallery = [];
let localSliders = []; // State Baru untuk Banner Slider Depan

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
        const res = await fetch(`${BASE_API_URL}/api/settings`, {
            headers: { 'X-Tenant-ID': tenantId }
        });
        const responseData = await res.json();
        if (responseData.status === "success") {
            // Konversi array database ke key-value object
            const settings = {};
            responseData.data.forEach(item => {
                settings[item.setting_key] = item.setting_value;
            });
            
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

            // Parse Array JSON secara aman (WordPress-Like)
            try { localNavigation = JSON.parse(settings.navigation_menu || "[]"); } catch (e) { localNavigation = []; }
            try { localTestimonials = JSON.parse(settings.site_testimonials || "[]"); } catch (e) { localTestimonials = []; }
            try { localGallery = JSON.parse(settings.site_gallery || "[]"); } catch (e) { localGallery = []; }
            try { localSliders = JSON.parse(settings.site_sliders || "[]"); } catch (e) { localSliders = []; }

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
            if (activeInlineTargetId.startsWith("modal-")) {
                const targetInput = document.getElementById(activeInlineTargetId);
                if (targetInput) {
                    targetInput.value = data.secure_url;
                    const modalPreview = document.getElementById(activeInlineTargetId + "-preview");
                    if (modalPreview) modalPreview.src = data.secure_url;
                }
            } else {
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

// COLOR PICKER SYNC
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
// GLOBAL SAVE METHOD KE VPS ENDPOINT AMAN
// ------------------------------------------------------------
async function executeUpdateSettings(payload) {
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
        return data.status === "success";
    } catch (err) {
        console.error("Gagal mengirim payload ke database VPS.", err);
        return false;
    }
}

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

    const success = await executeUpdateSettings(payload);
    if (success) {
        if (newTokenValue !== apiKey) {
            apiKey = newTokenValue;
            localStorage.setItem('cms_api_key', apiKey);
        }
        Swal.fire('Berhasil', 'Konfigurasi website berhasil disimpan!', 'success');
        loadSettings();
    } else {
        Swal.fire('Error', 'Gagal memperbarui konfigurasi di VPS.', 'error');
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

    const success = await executeUpdateSettings(payload);
    if (success) {
        Swal.fire('Berhasil', 'Skema warna tema berhasil diterapkan!', 'success');
        loadSettings();
    } else {
        Swal.fire('Error', 'Gagal memproses tema ke server.', 'error');
    }
}

async function saveInstagram() {
    const payload = [
        { key: 'instagram_active', value: document.getElementById('instagramActiveField').value },
        { key: 'instagram_username', value: document.getElementById('instagramUserField').value.trim() }
    ];

    Swal.fire({ title: 'Menyimpan Instagram...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const success = await executeUpdateSettings(payload);
    if (success) {
        Swal.fire('Berhasil', 'Pengaturan widget Instagram berhasil disimpan!', 'success');
        loadSettings();
    } else {
        Swal.fire('Error', 'Gagal memproses pengaturan Instagram.', 'error');
    }
}

// ------------------------------------------------------------
// SMART CRUD 1: MENU NAVIGASI (WordPress-Like Key-Value Storage)
// ------------------------------------------------------------
function loadNavigationTable() {
    const container = document.getElementById('navigationTableBody');
    container.innerHTML = "";

    // Urutkan navigasi secara berurutan
    localNavigation.sort((a, b) => Number(a.order_num || 0) - Number(b.order_num || 0));

    if (localNavigation.length > 0) {
        localNavigation.forEach((item, index) => {
            container.innerHTML += `
                <tr class="bg-white border-b hover:bg-gray-50">
                    <td class="px-6 py-4 font-bold text-gray-900">${item.title_id}</td>
                    <td class="px-6 py-4 font-bold text-gray-900">${item.title_en}</td>
                    <td class="px-6 py-4 font-mono text-xs text-indigo-600">${item.target_url}</td>
                    <td class="px-6 py-4">${item.order_num}</td>
                    <td class="px-6 py-4 text-center space-x-2">
                        <button onclick="editNavigation(${index})" class="text-indigo-600 hover:text-indigo-900 font-bold"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteNavigation(${index})" class="text-red-600 hover:text-red-900 font-bold"><i class="fas fa-trash-alt"></i></button>
                    </td>
                </tr>`;
        });
    } else {
        container.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-gray-400">Belum ada menu kustom.</td></tr>`;
    }
}

async function openNavigationModal(indexToEdit = null) {
    const isEdit = indexToEdit !== null;
    const currentItem = isEdit ? localNavigation[indexToEdit] : { title_id: "", title_en: "", target_url: "", order_num: "0" };

    const { value: formValues } = await Swal.fire({
        title: isEdit ? 'Edit Menu Navigasi' : 'Tambah Menu Navigasi',
        html: `
            <div class="space-y-3 text-left">
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Nama Menu (Bahasa Indonesia)</label>
                    <input id="nav-title-id" class="swal2-input w-full m-0 rounded-xl" placeholder="Syarat Sewa" value="${currentItem.title_id}">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Nama Menu (English Version)</label>
                    <input id="nav-title-en" class="swal2-input w-full m-0 rounded-xl" placeholder="Rental Terms" value="${currentItem.title_en}">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Target Tautan URL (Contoh: #armada atau page.html)</label>
                    <input id="nav-target" class="swal2-input w-full m-0 rounded-xl font-mono text-sm" placeholder="tos.html" value="${currentItem.target_url}">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Nomor Urutan Tampilan (1, 2, 3)</label>
                    <input id="nav-order" type="number" class="swal2-input w-full m-0 rounded-xl" value="${currentItem.order_num}">
                </div>
            </div>`,
        focusConfirm: false,
        preConfirm: () => {
            return {
                title_id: document.getElementById('nav-title-id').value.trim(),
                title_en: document.getElementById('nav-title-en').value.trim(),
                target_url: document.getElementById('nav-target').value.trim(),
                order_num: document.getElementById('nav-order').value
            }
        }
    });

    if (formValues) {
        if (!formValues.title_id || !formValues.target_url) {
            Swal.fire('Gagal', 'Nama menu dan Tautan wajib diisi.', 'warning');
            return;
        }

        if (isEdit) {
            localNavigation[indexToEdit] = formValues;
        } else {
            localNavigation.push(formValues);
        }

        executeSaveSerializedJSON('navigation_menu', localNavigation, 'Navigasi disimpan.', loadNavigationTable);
    }
}

function editNavigation(index) {
    openNavigationModal(index);
}

function deleteNavigation(index) {
    Swal.fire({
        title: 'Hapus Menu?',
        text: 'Menu ini akan dihapus dari navigasi website.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, hapus!'
    }).then((result) => {
        if (result.isConfirmed) {
            localNavigation.splice(index, 1);
            executeSaveSerializedJSON('navigation_menu', localNavigation, 'Menu navigasi berhasil dihapus.', loadNavigationTable);
        }
    });
}

// ------------------------------------------------------------
// SMART CRUD 2: MANAJEMEN SLIDER BANNER (WordPress-Like Key-Value Storage)
// ------------------------------------------------------------
function loadSliders() {
    const container = document.getElementById('slidersGridContainer');
    container.innerHTML = "";

    if (localSliders.length > 0) {
        localSliders.forEach((item, index) => {
            container.innerHTML += `
                <div class="bg-white border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition">
                    <div class="h-40 w-full bg-gray-100 overflow-hidden relative">
                        <img class="w-full h-full object-cover" src="${item.image_url}" alt="Slider">
                    </div>
                    <div class="p-4 flex flex-col justify-between">
                        <div>
                            <h4 class="text-sm font-bold text-gray-900">${item.title || 'Untitled Slide'}</h4>
                            <p class="text-xs text-gray-400 mt-1">ID: "${item.subtitle_id || '-'}"</p>
                            <p class="text-xs text-gray-400 mt-1">EN: "${item.subtitle_en || '-'}"</p>
                        </div>
                        <div class="flex justify-end gap-3 mt-4 border-t pt-3">
                            <button onclick="editSlider(${index})" class="text-indigo-600 hover:text-indigo-900 text-xs font-bold"><i class="fas fa-edit"></i> Edit</button>
                            <button onclick="deleteSlider(${index})" class="text-red-600 hover:text-red-900 text-xs font-bold"><i class="fas fa-trash-alt"></i> Hapus</button>
                        </div>
                    </div>
                </div>`;
        });
    } else {
        container.innerHTML = `<div class="col-span-2 text-center py-10 text-gray-400 font-semibold">Belum ada slide banner kustom.</div>`;
    }
}

async function openSliderModal(indexToEdit = null) {
    const isEdit = indexToEdit !== null;
    const currentItem = isEdit ? localSliders[indexToEdit] : { title: "", subtitle_id: "", subtitle_en: "", image_url: "" };

    const { value: formValues } = await Swal.fire({
        title: isEdit ? 'Edit Slide Banner' : 'Tambah Slide Baru',
        html: `
            <div class="space-y-3 text-left">
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Judul Slide (Headline)</label>
                    <input id="slide-title" class="swal2-input w-full m-0 rounded-xl" placeholder="Promo Sewa Motor" value="${currentItem.title}">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Sub-Judul (Bahasa Indonesia)</label>
                    <input id="slide-sub-id" class="swal2-input w-full m-0 rounded-xl" placeholder="Diskon akhir pekan..." value="${currentItem.subtitle_id}">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Sub-Title (English Version)</label>
                    <input id="slide-sub-en" class="swal2-input w-full m-0 rounded-xl" placeholder="Weekend discount..." value="${currentItem.subtitle_en}">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">File Gambar Banner (Direct Upload)</label>
                    <div class="flex gap-2">
                        <input id="modal-slide-image" class="swal2-input flex-1 m-0 rounded-xl text-xs font-mono" placeholder="https://..." value="${currentItem.image_url}">
                        <button type="button" onclick="triggerInlineUpload('modal-slide-image')" class="bg-indigo-600 text-white font-bold px-3 rounded-xl text-xs">Upload</button>
                    </div>
                    <div class="mt-2 text-center">
                        <img id="modal-slide-image-preview" class="max-h-24 rounded border object-contain mx-auto bg-gray-50" src="${currentItem.image_url || 'https://placehold.co/200x100/3E2723/ffffff?text=Preview'}">
                    </div>
                </div>
            </div>`,
        focusConfirm: false,
        preConfirm: () => {
            return {
                title: document.getElementById('slide-title').value.trim(),
                subtitle_id: document.getElementById('slide-sub-id').value.trim(),
                subtitle_en: document.getElementById('slide-sub-en').value.trim(),
                image_url: document.getElementById('modal-slide-image').value.trim()
            }
        }
    });

    if (formValues) {
        if (!formValues.title || !formValues.image_url) {
            Swal.fire('Gagal', 'Judul dan File gambar wajib diisi.', 'warning');
            return;
        }

        if (isEdit) {
            localSliders[indexToEdit] = formValues;
        } else {
            localSliders.push(formValues);
        }

        executeSaveSerializedJSON('site_sliders', localSliders, 'Slide banner berhasil disimpan.', loadSliders);
    }
}

function editSlider(index) {
    openSliderModal(index);
}

function deleteSlider(index) {
    Swal.fire({
        title: 'Hapus Slide?',
        text: "Slide terpilih akan dihapus permanen.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, hapus!'
    }).then((result) => {
        if (result.isConfirmed) {
            localSliders.splice(index, 1);
            executeSaveSerializedJSON('site_sliders', localSliders, 'Slide berhasil dihapus.', loadSliders);
        }
    });
}

// ------------------------------------------------------------
// SMART CRUD 3: TESTIMONI PELANGGAN (WordPress-Like Key-Value Storage)
// ------------------------------------------------------------
function loadTestimonials() {
    const container = document.getElementById('testimonialsGridContainer');
    container.innerHTML = "";

    if (localTestimonials.length > 0) {
        localTestimonials.forEach((item, index) => {
            let stars = "";
            for (let s = 1; s <= 5; s++) {
                stars += `<i class="fa${s <= Number(item.rating || 5) ? 's' : 'r'} fa-star text-yellow-400"></i>`;
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
                        </div>
                        <p class="text-xs text-gray-600 mt-3 font-semibold">ID: "${item.comment_id}"</p>
                        <p class="text-xs text-gray-400 mt-1 font-semibold italic">EN: "${item.comment_en}"</p>
                        
                        <div class="flex justify-end gap-3 mt-4 border-t pt-3">
                            <button onclick="editTestimonial(${index})" class="text-indigo-600 hover:text-indigo-900 text-xs font-bold"><i class="fas fa-edit"></i> Edit</button>
                            <button onclick="deleteTestimonial(${index})" class="text-red-600 hover:text-red-900 text-xs font-bold"><i class="fas fa-trash-alt"></i> Hapus</button>
                        </div>
                    </div>
                </div>`;
        });
    } else {
        container.innerHTML = `<div class="col-span-2 text-center py-10 text-gray-400 font-semibold">Belum ada ulasan testimoni pelanggan.</div>`;
    }
}

async function openTestimonialModal(indexToEdit = null) {
    const isEdit = indexToEdit !== null;
    const currentItem = isEdit ? localTestimonials[indexToEdit] : { customer_name: "", customer_avatar: "", rating: "5", comment_id: "", comment_en: "" };

    const { value: formValues } = await Swal.fire({
        title: isEdit ? 'Edit Ulasan Pelanggan' : 'Tambah Ulasan Pelanggan',
        html: `
            <div class="space-y-3 text-left">
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Nama Lengkap Pelanggan</label>
                    <input id="testi-name" class="swal2-input w-full m-0 rounded-xl" placeholder="John Doe" value="${currentItem.customer_name}">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Link Foto Pelanggan (Avatar URL)</label>
                    <div class="flex gap-2">
                        <input id="modal-testi-avatar" class="swal2-input flex-1 m-0 rounded-xl text-xs font-mono" placeholder="https://..." value="${currentItem.customer_avatar}">
                        <button type="button" onclick="triggerInlineUpload('modal-testi-avatar')" class="bg-indigo-600 text-white font-bold px-3 rounded-xl text-xs">Upload</button>
                    </div>
                    <div class="mt-2 text-center">
                        <img id="modal-testi-avatar-preview" class="w-10 h-10 rounded-full border object-cover mx-auto" src="${currentItem.customer_avatar || 'https://placehold.co/100/3E2723/ffffff?text=U'}">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Jumlah Bintang (Rating 1 - 5)</label>
                    <select id="testi-rating" class="swal2-input w-full m-0 rounded-xl">
                        <option value="5" ${currentItem.rating === "5" ? "selected" : ""}>★★★★★ - Sangat Puas</option>
                        <option value="4" ${currentItem.rating === "4" ? "selected" : ""}>★★★★☆ - Puas</option>
                        <option value="3" ${currentItem.rating === "3" ? "selected" : ""}>★★★☆☆ - Cukup</option>
                        <option value="2" ${currentItem.rating === "2" ? "selected" : ""}>★★☆☆☆ - Kurang</option>
                        <option value="1" ${currentItem.rating === "1" ? "selected" : ""}>★☆☆☆☆ - Kecewa</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Ulasan (Bahasa Indonesia)</label>
                    <textarea id="testi-comment-id" class="swal2-textarea w-full m-0 rounded-xl border p-2 h-16" placeholder="Sewa motor di sini sangat ramah dan cepat...">${currentItem.comment_id}</textarea>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Comment (English Version)</label>
                    <textarea id="testi-comment-en" class="swal2-textarea w-full m-0 rounded-xl border p-2 h-16" placeholder="Very clean bikes and excellent customer service...">${currentItem.comment_en}</textarea>
                </div>
            </div>`,
        focusConfirm: false,
        preConfirm: () => {
            return {
                customer_name: document.getElementById('testi-name').value.trim(),
                customer_avatar: document.getElementById('modal-testi-avatar').value.trim(),
                rating: document.getElementById('testi-rating').value,
                comment_id: document.getElementById('testi-comment-id').value.trim(),
                comment_en: document.getElementById('testi-comment-en').value.trim()
            }
        }
    });

    if (formValues) {
        if (!formValues.customer_name || !formValues.comment_id || !formValues.comment_en) {
            Swal.fire('Gagal', 'Lengkapi kolom nama dan ulasan.', 'warning');
            return;
        }

        if (isEdit) {
            localTestimonials[indexToEdit] = formValues;
        } else {
            localTestimonials.push(formValues);
        }

        executeSaveSerializedJSON('site_testimonials', localTestimonials, 'Testimoni disimpan.', loadTestimonials);
    }
}

function editTestimonial(index) {
    openTestimonialModal(index);
}

function deleteTestimonial(index) {
    Swal.fire({
        title: 'Hapus Testimoni?',
        text: "Ulasan terpilih akan dihapus permanen.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, hapus!'
    }).then((result) => {
        if (result.isConfirmed) {
            localTestimonials.splice(index, 1);
            executeSaveSerializedJSON('site_testimonials', localTestimonials, 'Ulasan berhasil dihapus.', loadTestimonials);
        }
    });
}

// ------------------------------------------------------------
// SMART CRUD 4: GALERI ALBUM FOTO (WordPress-Like Key-Value Storage)
// ------------------------------------------------------------
function loadGalleries() {
    const container = document.getElementById('galleriesGridContainer');
    container.innerHTML = "";

    if (localGallery.length > 0) {
        localGallery.forEach((item, index) => {
            container.innerHTML += `
                <div class="bg-white border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition">
                    <div class="h-44 w-full bg-gray-100 overflow-hidden relative">
                        <img class="w-full h-full object-cover transition transform hover:scale-105 duration-300" src="${item.image_url}" alt="Galeri">
                    </div>
                    <div class="p-4 flex flex-col justify-between">
                        <div>
                            <h4 class="text-xs font-bold text-gray-400 uppercase font-mono">${item.album_name_id}</h4>
                            <p class="text-xs text-gray-500 mt-2 line-clamp-2">${item.caption_id || '-'}</p>
                        </div>
                        <div class="flex justify-end gap-3 mt-4 border-t pt-3">
                            <button onclick="editGallery(${index})" class="text-indigo-600 hover:text-indigo-900 text-xs font-bold"><i class="fas fa-edit"></i> Edit</button>
                            <button onclick="deleteGallery(${index})" class="text-red-600 hover:text-red-900 text-xs font-bold"><i class="fas fa-trash-alt"></i> Hapus</button>
                        </div>
                    </div>
                </div>`;
        });
    } else {
        container.innerHTML = `<div class="col-span-3 text-center py-10 text-gray-400 font-semibold">Album galeri foto masih kosong.</div>`;
    }
}

async function openGalleryModal(indexToEdit = null) {
    const isEdit = indexToEdit !== null;
    const currentItem = isEdit ? localGallery[indexToEdit] : { album_name_id: "", album_name_en: "", image_url: "", caption_id: "", caption_en: "" };

    const { value: formValues } = await Swal.fire({
        title: isEdit ? 'Edit Album Galeri Foto' : 'Unggah Foto Baru',
        html: `
            <div class="space-y-3 text-left">
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Nama Album (Bahasa Indonesia)</label>
                    <input id="gal-album-id" class="swal2-input w-full m-0 rounded-xl" placeholder="Dokumentasi Pelanggan" value="${currentItem.album_name_id}">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Album Name (English Version)</label>
                    <input id="gal-album-en" class="swal2-input w-full m-0 rounded-xl" placeholder="Customer Documentation" value="${currentItem.album_name_en}">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">File Gambar (Image CDN URL)</label>
                    <div class="flex gap-2">
                        <input id="modal-gal-image" class="swal2-input flex-1 m-0 rounded-xl text-xs font-mono" placeholder="https://..." value="${currentItem.image_url}">
                        <button type="button" onclick="triggerInlineUpload('modal-gal-image')" class="bg-indigo-600 text-white font-bold px-3 rounded-xl text-xs">Upload</button>
                    </div>
                    <div class="mt-2 text-center">
                        <img id="modal-gal-image-preview" class="max-h-24 rounded border object-contain mx-auto bg-gray-50" src="${currentItem.image_url || 'https://placehold.co/200x100/3E2723/ffffff?text=Preview'}">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Caption / Keterangan (Bahasa Indonesia)</label>
                    <input id="gal-caption-id" class="swal2-input w-full m-0 rounded-xl" placeholder="Foto kebahagiaan pelanggan saat rental motor" value="${currentItem.caption_id}">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Caption / Description (English Version)</label>
                    <input id="gal-caption-en" class="swal2-input w-full m-0 rounded-xl" placeholder="Customer happiness while renting scooter" value="${currentItem.caption_en}">
                </div>
            </div>`,
        focusConfirm: false,
        preConfirm: () => {
            return {
                album_name_id: document.getElementById('gal-album-id').value.trim(),
                album_name_en: document.getElementById('gal-album-en').value.trim(),
                image_url: document.getElementById('modal-gal-image').value.trim(),
                caption_id: document.getElementById('gal-caption-id').value.trim(),
                caption_en: document.getElementById('gal-caption-en').value.trim()
            }
        }
    });

    if (formValues) {
        if (!formValues.album_name_id || !formValues.image_url) {
            Swal.fire('Gagal', 'Nama album dan File gambar wajib diisi.', 'warning');
            return;
        }

        if (isEdit) {
            localGallery[indexToEdit] = formValues;
        } else {
            localGallery.push(formValues);
        }

        executeSaveSerializedJSON('site_gallery', localGallery, 'Foto berhasil ditambahkan ke Galeri Album.', loadGalleries);
    }
}

function editGallery(index) {
    openGalleryModal(index);
}

function deleteGallery(index) {
    Swal.fire({
        title: 'Hapus Foto Ini?',
        text: "Foto akan dihapus secara permanen dari album.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, hapus!'
    }).then((result) => {
        if (result.isConfirmed) {
            localGallery.splice(index, 1);
            executeSaveSerializedJSON('site_gallery', localGallery, 'Foto berhasil dihapus dari album.', loadGalleries);
        }
    });
}

// ------------------------------------------------------------
// UTILITY: SERIALIZE ARRAY TO DATABASE KEY-VALUE
// ------------------------------------------------------------
async function executeSaveSerializedJSON(dbKey, localArray, successMessage, reloadCallback) {
    Swal.fire({ title: 'Menyimpan ke VPS...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const payload = [
        { key: dbKey, value: JSON.stringify(localArray) }
    ];

    const success = await executeUpdateSettings(payload);
    Swal.close();
    
    if (success) {
        Swal.fire({ title: 'Sukses!', text: successMessage, icon: 'success', timer: 1500, showConfirmButton: false });
        reloadCallback();
    } else {
        Swal.fire('Gagal', 'Terjadi gangguan saat menyimpan ke database MySQL VPS.', 'error');
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('bg-indigo-800'));
    
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    event.currentTarget.classList.add('bg-indigo-800');

    if (tabId === 'navigation') loadNavigationTable();
    if (tabId === 'sliders') loadSliders();
    if (tabId === 'testimonials') loadTestimonials();
    if (tabId === 'galleries') loadGalleries();
}

function logout() {
    localStorage.clear();
    location.reload();
}