import { db, collection, getDocs, query, orderBy } from './firebase-config.js';

window.projectsData = {};

document.addEventListener('DOMContentLoaded', async () => {
    const masonryContainer = document.querySelector('.masonry-grid');
    const heroCols = document.querySelectorAll('.animate-float, .animate-float-reverse');
    
    try {
        // Avoid requiring a composite index by fetching all and filtering locally
        const q = query(
            collection(db, 'projects'),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            // If database is empty, maintain the premium hardcoded demo data and just initialize filters
            console.log("No projects found in DB. Showing demo content.");
            initializeFilters();
            return;
        }

        let allImages = [];
        let html = '';
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (!data.published) return; // Client-side filter
            
            if(data.imageUrl) allImages.push(data.imageUrl);

            window.projectsData[doc.id] = data;

            let catLabel = data.category ? data.category.toLowerCase() : 'all';
            html += `
            <div class="masonry-item group relative bg-surface-container transition-opacity duration-500 cursor-pointer" data-category="${catLabel}" onclick="openProjectModal('${doc.id}')">
                <div class="block w-full h-full overflow-hidden">
                    <img class="w-full h-auto transition-all duration-700 ease-out group-hover:scale-[1.03]" alt="${data.title}" src="${data.imageUrl}">
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6 backdrop-blur-[2px]">
                        <p class="text-[10px] tracking-widest uppercase text-white font-medium">${data.title} / ${data.category}</p>
                    </div>
                </div>
            </div>`;
        });
        
        // Replace static grid with live data
        masonryContainer.innerHTML = html;

        // Auto-fill hero section with live project images
        if (allImages.length > 0) {
            heroCols.forEach((col, index) => {
                let colHtml = '';
                // 3 or 4 images per column
                for(let i=0; i<4; i++) {
                    const randomImg = allImages[Math.floor(Math.random() * allImages.length)];
                    // Vary aspect ratios for the masonry feel in the animation
                    const aspect = i % 2 === 0 ? 'aspect-[4/3]' : 'aspect-[3/4]';
                    colHtml += `<img class="w-full ${aspect} object-cover" src="${randomImg}">`;
                }
                col.innerHTML = colHtml;
            });
        }

        initializeFilters();

    } catch(err) {
        console.error("Error loading projects: ", err);
        // Fallback to static filters if DB fetch fails
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

// Global modal handlers
window.openProjectModal = (id) => {
    const data = window.projectsData[id];
    if (!data) return;

    document.getElementById('modal-category').textContent = data.category || '';
    document.getElementById('modal-title').textContent = data.title;
    document.getElementById('modal-narrative').innerHTML = (data.narrative || '').replace(/\n/g, '<br>');
    document.getElementById('modal-hero').src = data.imageUrl;

    const galleryContainer = document.getElementById('modal-gallery');
    if (data.galleryUrls && data.galleryUrls.length > 0) {
        galleryContainer.classList.remove('hidden');
        let html = '';
        data.galleryUrls.forEach((url, index) => {
            html += `
                <div class="w-full h-full flex justify-center bg-transparent relative">
                    <img class="max-w-full md:max-w-md lg:max-w-lg h-auto object-contain shadow-2xl rounded-lg hover:scale-[1.02] transition-transform duration-1000 ease-out" src="${url}" alt="Secondary Visual">
                </div>
            `;
        });
        galleryContainer.innerHTML = html;
    } else {
        galleryContainer.innerHTML = '';
        galleryContainer.classList.add('hidden');
    }

    const modal = document.getElementById('project-modal');
    modal.classList.remove('hidden');
    // Lock body scroll
    document.body.classList.add('overflow-hidden');
    
    // Reset scroll positions
    const inner = document.getElementById('modal-inner');
    const scrollArea = document.getElementById('modal-scroll-area');
    if (inner) inner.scrollTop = 0;
    if (scrollArea) scrollArea.scrollTop = 0;
    
    // Animate in
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
    });
};

function closeModal() {
    const modal = document.getElementById('project-modal');
    if (modal.classList.contains('hidden')) return;
    modal.classList.add('opacity-0');
    document.body.classList.remove('overflow-hidden');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 500);
}

document.getElementById('close-modal').addEventListener('click', closeModal);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});
