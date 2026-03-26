import { db, collection, getDocs, query, where, orderBy } from './firebase-config.js';

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

            let catLabel = data.category ? data.category.toLowerCase() : 'all';
            // Determine grayscale behavior based on category or random, but let's just make it hover-reveal like the existing design
            html += `
            <div class="masonry-item group relative bg-surface-container transition-opacity duration-500" data-category="${catLabel}">
                <a href="project.html?id=${doc.id}" class="block w-full h-full overflow-hidden">
                    <img class="w-full h-auto grayscale hover:grayscale-0 transition-all duration-700 ease-out" alt="${data.title}" src="${data.imageUrl}">
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6 backdrop-blur-[2px]">
                        <p class="text-[10px] tracking-widest uppercase text-white font-medium">${data.title} / ${data.category}</p>
                    </div>
                </a>
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
