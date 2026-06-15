// CONFIG UTAMA FRONTEND (MENGGUNAKAN JALUR HTTPS REVERSE PROXY NGINX VPS STABIL ANDA)
const BASE_API_URL = "https://wa.mrdsolution.my.id/cms-api"; 
const TENANT_ID = "cms_493_scooter";

let adminWA = "6285739403193";
let namaKlien = "493 Scooter Rentals";
let liveGasUrl = "https://script.google.com/macros/s/AKfycby-xoi9mMwmXGwy6BRrIFfJxUisjaj_n3u-G5lc6mb9tj3GMXvDs4j1GGxTh4U6sW6v/exec";

// 1. INisialisasi CONFIG & TEMING DARI DATABASE MYSQL KLIEN
async function initPage() {
    try {
        const res = await fetch(`${BASE_API_URL}/api/settings`, {
            headers: { 'X-Tenant-ID': TENANT_ID }
        });
        const responseData = await res.json();
        
        if (responseData.status === "success") {
            const settings = {};
            responseData.data.forEach(item => {
                settings[item.setting_key] = item.setting_value;
            });

            // Suntik Variabel Warna Tema Dinamis ke CSS Root
            const root = document.documentElement;
            root.style.setProperty('--primary-yellow', settings.primary_color || '#FFD700');
            root.style.setProperty('--dark-brown', settings.secondary_color || '#3E2723');
            root.style.setProperty('--bg-page', settings.bg_color || '#fdfaf5');
            root.style.setProperty('--text-dark', settings.text_color || '#2C1B18');

            adminWA = settings.whatsapp_number || "6285739403193";
            namaKlien = settings.site_name || "493 Scooter Rentals";
            
            if (settings.gas_url) {
                liveGasUrl = settings.gas_url;
            }

            const siteName = settings.site_name || "493 Scooter Rentals";
            const logoUrl = settings.logo_url || "https://i.ibb.co.com/RT54HDDv/1000147993.png";
            const taglineId = settings.tagline_id || settings.tagline || "Eksplorasi Bali Lebih Mudah & Seru";
            const taglineEn = settings.tagline_en || settings.tagline || "Explore Bali Easier & More Fun";
            const addressText = settings.address || "Jl. Nakula Gg. Baik-Baik No.1, Seminyak, Bali";

            const firstWord = siteName.split(' ')[0] || "493";
            const restOfName = siteName.split(' ').slice(1).join(' ') || "Scooter Rentals";

            document.getElementById('siteFavicon').href = settings.favicon_url || logoUrl;
            document.getElementById('siteLogo').src = logoUrl;
            document.getElementById('siteTitleNav').innerHTML = `${firstWord} <b>${restOfName}</b>`;
            document.getElementById('siteHeroTitle').innerText = siteName;
            document.getElementById('siteTaglineId').innerText = taglineId;
            document.getElementById('siteTaglineEn').innerText = taglineEn;
            document.getElementById('siteFooterName').innerText = siteName;
            document.getElementById('siteFooterAddress').innerText = addressText;
            document.getElementById('floatingWaLink').href = `https://wa.me/${adminWA}`;
            
            if (settings.google_maps_embed) {
                document.getElementById('mapContainer').innerHTML = settings.google_maps_embed;
            }

            // SMART INSTAGRAM INTEGRATOR: ON/OFF SAKELAR DARI VPS
            if (settings.instagram_active === "1" && settings.instagram_username) {
                const igContainer = document.getElementById('instagramEmbedContainer');
                igContainer.innerHTML = `
                    <iframe src="https://www.instagram.com/${settings.instagram_username}/embed/" 
                            width="100%" 
                            height="100%" 
                            frameborder="0" 
                            scrolling="no" 
                            allowtransparency="true">
                    </iframe>`;
                document.getElementById('instagramSection').style.display = "block";
            } else {
                document.getElementById('instagramSection').style.display = "none";
            }

            // Parse Menu Navigasi berbasis JSON Dinamis (WordPress-Like)
            let navigationMenu = [];
            try {
                navigationMenu = JSON.parse(settings.navigation_menu || "[]");
            } catch (e) {
                console.warn("Gagal mengurai JSON navigasi menu.", e);
            }
            renderNavigation(navigationMenu, settings.cari_unit_active || "1");

            // Parse Banner Slider Depan (Dinamis Cloudinary)
            let sliderBanners = [];
            try {
                sliderBanners = JSON.parse(settings.site_sliders || "[]");
            } catch (e) {
                sliderBanners = [];
            }
            
            // Jalankan loop slider harian jika berkas array ada isinya
            if (sliderBanners.length > 0) {
                startImageSlider(sliderBanners);
            }
        }
    } catch (err) {
        console.warn("[CMS Framework Error] Gagal merender data dinamis VPS. Memuat fallback.", err);
    }
    loadFleet();
}

// ------------------------------------------------------------
// SMOOTH AUTO-SLIDER BANNER SYSTEM (3 DETIK LOOP)
// ------------------------------------------------------------
let sliderActiveIndex = 0;
let sliderLoopTimer = null;

function startImageSlider(slides) {
    if (!slides || slides.length === 0) return;

    const heroSection = document.getElementById('home');
    const titleEl = document.getElementById('siteHeroTitle');
    const taglineIdEl = document.getElementById('siteTaglineId');
    const taglineEnEl = document.getElementById('siteTaglineEn');

    function showSlide(index) {
        const slide = slides[index];
        
        // Buat efek transisi fade-in background mulus secara linear
        heroSection.style.transition = "background-image 0.8s ease-in-out";
        heroSection.style.backgroundImage = `linear-gradient(rgba(62, 39, 35, 0.6), rgba(0, 0, 0, 0.8)), url('${slide.image_url}')`;
        
        // Suntik teks kustom khusus jika diisi di panel admin slide tersebut, jika kosong fallback ke namaKlien
        titleEl.innerText = slide.title || namaKlien;
        taglineIdEl.innerText = slide.subtitle_id || "";
        taglineEnEl.innerText = slide.subtitle_en || "";
    }

    // Tampilkan slide ke-1 di awal
    showSlide(sliderActiveIndex);

    // Jalankan timer loop per 3 detik
    if (sliderLoopTimer) clearInterval(sliderLoopTimer);
    sliderLoopTimer = setInterval(() => {
        sliderActiveIndex = (sliderActiveIndex + 1) % slides.length;
        showSlide(sliderActiveIndex);
    }, 3000);
}

function renderNavigation(menus, cariUnitActive) {
    const desktopNav = document.getElementById('desktopNav');
    const drawerLinks = document.getElementById('drawerLinks');
    
    if (!desktopNav || !drawerLinks) return;
    
    desktopNav.innerHTML = "";
    drawerLinks.innerHTML = "";

    // Urutkan menu navigasi berdasarkan order_num secara numerik
    menus.sort((a, b) => Number(a.order_num || 0) - Number(b.order_num || 0));

    menus.forEach(menu => {
        const itemHtml = `
            <a onclick="slowScroll('${menu.target_url}')">
                <span class="id">${menu.title_id}</span>
                <span class="en">${menu.title_en}</span>
            </a>
        `;
        desktopNav.innerHTML += `<li>${itemHtml}</li>`;
        drawerLinks.innerHTML += itemHtml;
    });

    // SISTEM INTELEKTUAL SAKELAR CARI UNIT
    if (cariUnitActive === "1") {
        const cekUnitHtml = `
            <a href="cariunit.html">
                <span class="id">Cek Unit</span>
                <span class="en">Check Unit</span>
            </a>
        `;
        desktopNav.innerHTML += `<li>${cekUnitHtml}</li>`;
        drawerLinks.innerHTML += cekUnitHtml;
        
        const mobileCekBtn = document.getElementById('mobileCekUnitLink');
        if (mobileCekBtn) {
            mobileCekBtn.style.setProperty('display', 'block', 'important');
        }
    } else {
        const mobileCekBtn = document.getElementById('mobileCekUnitLink');
        if (mobileCekBtn) {
            mobileCekBtn.style.setProperty('display', 'none', 'important');
        }
    }
}

function toggleDrawer(open) {
    const drawer = document.getElementById('mobileDrawer');
    const backdrop = document.getElementById('drawerBackdrop');
    if (open) {
        drawer.classList.add('active');
        backdrop.classList.add('active');
    } else {
        drawer.classList.remove('active');
        backdrop.classList.remove('active');
    }
}

function toggleLang() {
    document.body.classList.toggle('lang-en');
    document.body.classList.toggle('lang-id');
    
    const btn = document.querySelector('.lang-btn');
    if (document.body.classList.contains('lang-en')) {
        btn.innerHTML = "EN | ID";
    } else {
        btn.innerHTML = "ID | EN";
    }
}

function slowScroll(target) {
    toggleDrawer(false);
    if (target.startsWith("#")) {
        const el = document.querySelector(target);
        if (el) window.scrollTo({ top: el.offsetTop - 90, behavior: 'smooth' });
    } else {
        window.location.href = target;
    }
}

function getAutoImage(type) {
    const t = type.toLowerCase();
    if (t.includes("nmax turbo")) return "https://i.ibb.co.com/LdfZG3jF/IMG-20260512-WA0041.jpg";
    if (t.includes("nmax neo")) return "https://i.ibb.co.com/Jj3MtHm7/IMG-20260519-WA0010.jpg";
    if (t.includes("nmax")) return "https://i.ibb.co.com/6JpHW94T/IMG-20260512-WA0053.jpg";
    if (t.includes("adv")) return "https://i.ibb.co.com/b5vVrKvV/IMG-20260512-WA0046.jpg";
    if (t.includes("gear")) return "https://i.ibb.co.com/jdgtRkQ/IMG-20260512-WA0040.jpg";
    if (t.includes("fino")) return "https://i.ibb.co.com/N6ZgKpdr/IMG-20260512-WA0055.jpg";
    if (t.includes("genio")) return "https://i.ibb.co.com/5W7MvdCG/IMG-20260512-WA0043.jpg";
    if (t.includes("lexi")) return "https://i.ibb.co.com/nMLLJ26m/IMG-20260512-WA0048.jpg";
    if (t.includes("mio")) return "https://i.ibb.co.com/84d2sdLB/IMG-20260512-WA0054.jpg";
    if (t.includes("niu")) return "https://i.ibb.co.com/JRgZ2VWr/IMG-20260512-WA0059.jpg";
    if (t.includes("pcx")) return "https://i.ibb.co.com/5gbZBQNN/IMG-20260512-WA0056.jpg";
    if (t.includes("scoopy 2023")) return "https://i.ibb.co.com/1fyD1Rqm/IMG-20260512-WA0042.jpg";
    if (t.includes("scoopy 2019")) return "https://i.ibb.co.com/FLyNk2kr/IMG-20260512-WA0057.jpg";
    if (t.includes("xmax")) return "https://i.ibb.co.com/6RWT05qb/IMG-20260512-WA0039.jpg";
    if (t.includes("vespa")) return "https://i.ibb.co.com/FbqGSSzC/IMG-20260512-WA0051.jpg";
    if (t.includes("stylo")) return "https://i.ibb.co.com/6RG8WkQW/IMG-20260512-WA0049.jpg";
    if (t.includes("vario karbu")) return "https://i.ibb.co.com/NgWRXN56/IMG-20260512-WA0050.jpg";
    if (t.includes("vario led")) return "https://i.ibb.co.com/23YkZ6Df/IMG-20260512-WA0045.jpg";
    if (t.includes("vario fi")) return "https://i.ibb.co.com/RpRrQpBL/IMG-20260512-WA0058.jpg";
    if (t.includes("fazzio")) return "https://i.ibb.co.com/rRzhpbkW/IMG-20260512-WA0047.jpg";
    if (t.includes("filano")) return "https://i.ibb.co.com/6RstwhrV/IMG-20260512-WA0062.jpg";
    if (t.includes("spacy")) return "https://i.ibb.co.com/B5VnNpq7/4b330d335cb1496c9556338e5429bac5.jpg";
    if (t.includes("beat")) return "https://i.ibb.co.com/6cG5CgTC/Honda-Beat-Sporty-Deluxe-Black-1.png";
    return "https://placehold.co/600x400/3E2723/ffffff?text=Unit+Ready";
}

async function loadFleet() {
    try {
        const res = await fetch(liveGasUrl);
        const data = await res.json();
        renderFleet(data.items);
    } catch (e) {
        console.error(e);
        document.getElementById('loadingFleet').innerHTML = "<p class='text-danger id'>Gagal memuat data.</p>";
    }
}

function renderFleet(items) {
    const container = document.getElementById('fleetContainer');
    if (!container) return;
    
    container.innerHTML = "";
    let groups = {};

    items.forEach(m => {
        if (!m || !m[1] || m[1].toString().trim() === "") return;
        const type = m[1], brand = m[2], price = m[3], customImage = m[4], status = (m[5] || "Available").toLowerCase();
        if (status === "bengkel") return;

        if (!groups[type]) {
            const finalImage = (customImage && customImage.includes("http")) ? customImage : getAutoImage(type);
            groups[type] = { brand, type, price, image: finalImage };
        }
    });

    for (const key in groups) {
        const g = groups[key];
        container.innerHTML += `
            <div class="fleet-card">
                <div class="img-wrapper">
                    <img src="${g.image}" alt="${g.type}" loading="lazy">
                    <div class="unit-info-overlay">
                        <span class="unit-brand">${g.brand}</span>
                        <span class="unit-name">${g.type}</span>
                        <span class="unit-price">Rp ${Number(g.price).toLocaleString('id-ID')} / day</span>
                        <a href="https://wa.me/${adminWA}?text=Hello ${namaKlien}, I want to rent ${g.brand} ${g.type}" class="btn-booking-slide">
                            <span class="id" style="display:none;">Sewa Sekarang</span><span class="en">Rent Now</span>
                        </a>
                    </div>
                </div>
            </div>`;
    }
}

initPage();