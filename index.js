import { db, collection, getDocs, query, orderBy, doc, getDoc, sanitize } from './firebase-config.js';

window.projectsData = {};

document.addEventListener('DOMContentLoaded', async () => {
    const masonryContainer = document.querySelector('.masonry-grid');
    const heroBg = document.getElementById('hero-bg');

    try {
        const q = query(
            collection(db, 'projects'),
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
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (!data.published) return;
            if(data.imageUrl) allImages.push(data.imageUrl);
            window.projectsData[doc.id] = data;
            projects.push({ id: doc.id, data });
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
                gridVisual = `<img class="w-full h-auto transition-all duration-700 ease-out group-hover:scale-[1.03]" alt="${safeTitle}" src="${sanitize(data.imageUrl)}" loading="lazy" decoding="async">`;
            } else if (data.videoUrl) {
                const embedUrl = getSafeEmbedUrl(data.videoUrl);
                if (embedUrl) {
                    gridVisual = `<iframe class="w-full aspect-video" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen sandbox="allow-scripts allow-same-origin"></iframe>`;
                } else {
                    gridVisual = `<div class="w-full aspect-square bg-zinc-100 flex items-center justify-center"><span class="material-symbols-outlined text-zinc-400 text-4xl">play_circle</span></div>`;
                }
            } else {
                gridVisual = `<div class="w-full aspect-square bg-zinc-100 flex items-center justify-center"><span class="material-symbols-outlined text-zinc-400 text-4xl">image</span></div>`;
            }

            html += `
            <div class="masonry-item group relative bg-surface-container transition-opacity duration-500 cursor-pointer" data-category="${catLabel}" data-project-id="${safeId}">
                <div class="block w-full h-full overflow-hidden">
                    ${gridVisual}
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6 backdrop-blur-[2px]">
                        <p class="text-[10px] tracking-widest uppercase text-white font-medium">${safeTitle} / ${safeCategory}</p>
                    </div>
                </div>
            </div>`;
        });

        masonryContainer.innerHTML = html;

        // Bind click events safely (no inline onclick)
        document.querySelectorAll('.masonry-item[data-project-id]').forEach(item => {
            item.addEventListener('click', () => {
                const projectId = item.getAttribute('data-project-id');
                openProjectModal(projectId);
            });
        });

        // Hero background images
        if (allImages.length > 0 && heroBg) {
            const aspects = ['aspect-[3/4]', 'aspect-[4/3]'];
            const colClasses = ['animate-float', 'animate-float-reverse', 'animate-float'];
            let heroBgHtml = '';
            colClasses.forEach((anim, colIndex) => {
                const hideOnMobile = colIndex === 2 ? 'hidden md:flex' : '';
                let colHtml = `<div class="${hideOnMobile} flex-1 flex flex-col gap-4 ${anim}">`;
                for (let i = 0; i < 2; i++) {
                    const randomImg = allImages[Math.floor(Math.random() * allImages.length)];
                    colHtml += `<img class="w-full ${aspects[i]} object-cover opacity-0 transition-opacity duration-1000" onload="this.classList.remove('opacity-0')" src="${sanitize(randomImg)}" loading="lazy" decoding="async">`;
                }
                colHtml += '</div>';
                heroBgHtml += colHtml;
            });
            heroBg.innerHTML = heroBgHtml;
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

function initializeFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const masonryItems = document.querySelectorAll('.masonry-item');

    const activeClasses = ['text-zinc-900', 'dark:text-zinc-50', 'font-bold', 'border-b', 'border-zinc-900', 'dark:border-zinc-50', 'pb-0.5'];
    const inactiveClasses = ['text-zinc-500', 'dark:text-zinc-400'];

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => {
                b.classList.remove(...activeClasses);
                b.classList.add(...inactiveClasses);
            });
            btn.classList.remove(...inactiveClasses);
            btn.classList.add(...activeClasses);

            const filterValue = btn.getAttribute('data-filter');
            masonryItems.forEach(item => {
                const isMatch = filterValue === 'all' || item.getAttribute('data-category').toLowerCase() === filterValue;
                if (isMatch) {
                    item.style.display = 'block';
                    setTimeout(() => item.classList.remove('opacity-0'), 10);
                } else {
                    item.classList.add('opacity-0');
                    setTimeout(() => item.style.display = 'none', 300);
                }
            });
        });
    });
}

// Only allow YouTube and Vimeo embeds — reject arbitrary URLs
function getSafeEmbedUrl(url) {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const viMatch = url.match(/vimeo\.com\/(\d+)/);
    if (viMatch) return `https://player.vimeo.com/video/${viMatch[1]}`;
    return null; // reject unknown URLs
}

function openProjectModal(id) {
    const data = window.projectsData[id];
    if (!data) return;

    // Use textContent for text, sanitize for attributes
    document.getElementById('modal-category').textContent = data.category || '';
    document.getElementById('modal-title').textContent = data.title;

    // Narrative: sanitize then convert newlines to <br>
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
        let html = '';
        data.galleryUrls.forEach((url) => {
            html += `
                <div class="w-full h-full flex justify-center bg-transparent relative">
                    <img class="max-w-full max-h-[85vh] h-auto object-contain shadow-2xl rounded-lg hover:scale-[1.01] transition-transform duration-1000 ease-out" src="${sanitize(url)}" alt="Secondary Visual">
                </div>`;
        });
        galleryContainer.innerHTML = html;
    } else {
        galleryContainer.innerHTML = '';
        galleryContainer.classList.add('hidden');
    }

    // Video embed — safe URLs only
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

    // Website button — validate URL protocol
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
