import { db, collection, getDocs, query, orderBy, where, doc, getDoc, sanitize } from './firebase-config.js';

window.projectsData = {};

document.addEventListener('DOMContentLoaded', async () => {
    const masonryContainer = document.getElementById('masonry-grid');
    const heroBg = document.getElementById('hero-bg');

    try {
        const q = query(
            collection(db, 'projects'),
            where('published', '==', true),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            initializeFilters();
            return;
        }

        let allImages = [];
        let html = '';

        let projects = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data.published) return;
            if(data.imageUrl) allImages.push(data.imageUrl);
            window.projectsData[docSnap.id] = data;
            projects.push({ id: docSnap.id, data });
        });

        // Fisher-Yates shuffle
        for (let i = projects.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [projects[i], projects[j]] = [projects[j], projects[i]];
        }

        projects.forEach(({ id, data }) => {
            const catLabel = sanitize(data.category ? data.category.toLowerCase() : 'all');
            const safeTitle = sanitize(data.title);
            const safeCategory = sanitize(data.category);
            const safeId = sanitize(id);

            let gridVisual = '';
            if (data.imageUrl) {
                gridVisual = `<img alt="${safeTitle}" src="${sanitize(data.imageUrl)}" loading="lazy" decoding="async">`;
            } else if (data.videoUrl) {
                const embedUrl = getSafeEmbedUrl(data.videoUrl);
                if (embedUrl) {
                    gridVisual = `<iframe style="width:100%;aspect-ratio:16/9;" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen sandbox="allow-scripts allow-same-origin"></iframe>`;
                } else {
                    gridVisual = `<div style="width:100%;aspect-ratio:1;background:#f4f4f5;display:flex;align-items:center;justify-content:center;"><span class="material-symbols-outlined" style="font-size:2.5rem;color:#a1a1aa;">play_circle</span></div>`;
                }
            } else {
                gridVisual = `<div style="width:100%;aspect-ratio:1;background:#f4f4f5;display:flex;align-items:center;justify-content:center;"><span class="material-symbols-outlined" style="font-size:2.5rem;color:#a1a1aa;">image</span></div>`;
            }

            html += `
            <div class="card" data-category="${catLabel}" data-project-id="${safeId}">
                ${gridVisual}
                <div class="card-overlay">
                    <p>${safeTitle} / ${safeCategory}</p>
                </div>
            </div>`;
        });

        masonryContainer.innerHTML = html;

        // Bind click events
        document.querySelectorAll('.card[data-project-id]').forEach(item => {
            item.addEventListener('click', () => {
                const projectId = item.getAttribute('data-project-id');
                openProjectModal(projectId);
            });
        });

        // Hero background images
        if (allImages.length > 0 && heroBg) {
            const colAnims = ['animate-float', 'animate-float-reverse', 'animate-float'];
            let heroBgHtml = '';
            colAnims.forEach((anim, colIndex) => {
                const hideOnMobile = colIndex === 2 ? 'style="display:none;"' : '';
                let colHtml = `<div class="hero-col ${anim}" ${hideOnMobile}>`;
                for (let i = 0; i < 2; i++) {
                    const randomImg = allImages[Math.floor(Math.random() * allImages.length)];
                    colHtml += `<img src="${sanitize(randomImg)}" loading="lazy" decoding="async" alt="">`;
                }
                colHtml += '</div>';
                heroBgHtml += colHtml;
            });
            heroBg.innerHTML = heroBgHtml;

            // Image trail — use project images
            initImageTrail(allImages);
        }

        initializeFilters();

        if (typeof window.initMasonryAnimations === 'function') {
            window.initMasonryAnimations();
        }

        // Load creator profile
        try {
            const profileSnap = await getDoc(doc(db, 'settings', 'profile'));
            if (profileSnap.exists()) {
                const profile = profileSnap.data();
                if (profile.displayName) {
                    const nameEl = document.getElementById('modal-creator-name');
                    if (nameEl) nameEl.textContent = profile.displayName;
                }
                if (profile.avatarUrl) {
                    const avatarEl = document.getElementById('modal-creator-avatar');
                    if (avatarEl) avatarEl.src = profile.avatarUrl;
                }
            }
        } catch(profileErr) {
            console.log('Could not load profile:', profileErr);
        }

    } catch(err) {
        console.error("Error loading projects: ", err);
        initializeFilters();
    }
});

/* ── Image Trail ── */
function initImageTrail(allImages) {
    const trailContainer = document.getElementById('image-trail');
    if (!trailContainer || allImages.length === 0) return;

    const POOL_SIZE = 12;
    const pool = [];
    let imgIndex = 0;
    let lastX = 0, lastY = 0;
    const DISTANCE_THRESHOLD = 80;

    // Shuffle a subset for the trail
    const trailImages = allImages.slice().sort(() => Math.random() - 0.5).slice(0, 8);
    if (trailImages.length === 0) return;

    // Pre-create image pool
    for (let i = 0; i < POOL_SIZE; i++) {
        const img = document.createElement('img');
        img.className = 'trail-img';
        img.src = trailImages[i % trailImages.length];
        trailContainer.appendChild(img);
        pool.push(img);
    }

    function spawnTrailImage(x, y) {
        const img = pool[imgIndex % POOL_SIZE];
        img.src = trailImages[imgIndex % trailImages.length];
        imgIndex++;

        gsap.killTweensOf(img);
        gsap.set(img, {
            left: x - img.offsetWidth / 2,
            top: y - img.offsetHeight / 2,
            opacity: 1,
            scale: 0.4,
            rotation: (Math.random() - 0.5) * 20,
            zIndex: imgIndex,
        });

        gsap.to(img, {
            scale: 1,
            duration: 0.5,
            ease: 'back.out(1.7)',
        });

        gsap.to(img, {
            opacity: 0,
            scale: 0.2,
            duration: 0.6,
            delay: 0.8,
            ease: 'power2.in',
        });
    }

    const hero = document.querySelector('.hero');
    if (hero) {
        hero.addEventListener('mousemove', (e) => {
            const rect = hero.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const dist = Math.hypot(x - lastX, y - lastY);

            if (dist > DISTANCE_THRESHOLD) {
                spawnTrailImage(x, y);
                lastX = x;
                lastY = y;
            }
        });
    }
}

/* ── Filters ── */
function initializeFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const cards = () => document.querySelectorAll('.card[data-category]');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active styles
            filterBtns.forEach(b => {
                b.style.fontWeight = '500';
                b.style.color = '#a1a1aa';
                b.style.borderBottom = '1px solid transparent';
            });
            btn.style.fontWeight = '700';
            btn.style.color = '#18181b';
            btn.style.borderBottom = '1px solid #18181b';

            const filterValue = btn.getAttribute('data-filter');
            cards().forEach(card => {
                const isMatch = filterValue === 'all' || card.getAttribute('data-category') === filterValue;
                if (isMatch) {
                    card.style.display = 'block';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 10);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(60px)';
                    setTimeout(() => card.style.display = 'none', 300);
                }
            });
        });
    });
}

// Only allow YouTube and Vimeo embeds
function getSafeEmbedUrl(url) {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const viMatch = url.match(/vimeo\.com\/(\d+)/);
    if (viMatch) return `https://player.vimeo.com/video/${viMatch[1]}`;
    return null;
}

function openProjectModal(id) {
    const data = window.projectsData[id];
    if (!data) return;

    document.getElementById('modal-category').textContent = data.category || '';
    document.getElementById('modal-title').textContent = data.title;

    const narrativeEl = document.getElementById('modal-narrative');
    narrativeEl.innerHTML = sanitize(data.narrative || '').replace(/\n/g, '<br>');

    const heroImg = document.getElementById('modal-hero');
    if (data.imageUrl) {
        heroImg.src = data.imageUrl;
        heroImg.classList.remove('hidden');
    } else {
        heroImg.src = '';
        heroImg.classList.add('hidden');
    }

    const galleryContainer = document.getElementById('modal-gallery');
    if (data.galleryUrls && data.galleryUrls.length > 0) {
        galleryContainer.classList.remove('hidden');
        let ghtml = '';
        data.galleryUrls.forEach((url) => {
            ghtml += `
                <div class="w-full h-full flex justify-center bg-transparent relative">
                    <img class="max-w-full max-h-[85vh] h-auto object-contain shadow-2xl rounded-lg hover:scale-[1.01] transition-transform duration-1000 ease-out" src="${sanitize(url)}" alt="Secondary Visual">
                </div>`;
        });
        galleryContainer.innerHTML = ghtml;
    } else {
        galleryContainer.innerHTML = '';
        galleryContainer.classList.add('hidden');
    }

    // Video embed
    const existingVideo = document.getElementById('modal-video-embed');
    if (existingVideo) existingVideo.remove();

    const embedUrl = getSafeEmbedUrl(data.videoUrl);
    if (embedUrl) {
        const iframe = document.createElement('iframe');
        iframe.id = 'modal-video-embed';
        iframe.src = embedUrl;
        iframe.className = 'w-full aspect-video rounded-lg shadow-2xl';
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
        iframe.setAttribute('frameborder', '0');
        heroImg.parentElement.insertBefore(iframe, heroImg.nextSibling);
    }

    // Website button
    const existingBtn = document.getElementById('modal-visit-web');
    if (existingBtn) existingBtn.remove();

    if (data.websiteUrl && /^https?:\/\//i.test(data.websiteUrl)) {
        const btn = document.createElement('a');
        btn.id = 'modal-visit-web';
        btn.href = data.websiteUrl;
        btn.target = '_blank';
        btn.rel = 'noopener noreferrer';
        btn.className = 'mt-8 flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl bg-white/5 border border-white/10 text-neutral-200 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-colors';
        btn.innerHTML = '<span class="material-symbols-outlined text-[16px]">open_in_new</span> Visit Website';
        narrativeEl.parentElement.insertBefore(btn, narrativeEl.nextSibling);
    }

    const modal = document.getElementById('project-modal');
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');

    const inner = document.getElementById('modal-inner');
    const scrollArea = document.getElementById('modal-scroll-area');
    if (inner) inner.scrollTop = 0;
    if (scrollArea) scrollArea.scrollTop = 0;

    requestAnimationFrame(() => modal.classList.remove('opacity-0'));
}

function closeModal() {
    const modal = document.getElementById('project-modal');
    if (modal.classList.contains('hidden')) return;
    modal.classList.add('opacity-0');
    document.body.classList.remove('overflow-hidden');
    setTimeout(() => modal.classList.add('hidden'), 500);
}

document.getElementById('close-modal').addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
