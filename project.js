import { db, doc, getDoc } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    
    if (!id) {
        window.location.replace('index.html');
        return;
    }

    try {
        const docRef = doc(db, 'projects', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            document.title = `${data.title} | Monograph`;
            
            document.getElementById('proj-category').textContent = data.category || 'Uncategorized';
            document.getElementById('proj-title').textContent = data.title;
            // Respect line breaks for natural editorial text
            document.getElementById('proj-narrative').innerHTML = (data.narrative || '').replace(/\n/g, '<br>');
            
            document.getElementById('proj-hero').src = data.imageUrl;

            // Optional secondary images
            if (data.galleryUrls && data.galleryUrls.length > 0) {
                const galleryContainer = document.getElementById('proj-gallery-container');
                galleryContainer.classList.remove('hidden');
                
                let html = '';
                // For layout rhythm: if it's an odd number of secondary images, the last one can span full width on desktop!
                data.galleryUrls.forEach((url, index) => {
                    const isLastOdd = (index === data.galleryUrls.length - 1) && (data.galleryUrls.length % 2 !== 0);
                    const colClass = isLastOdd ? 'md:col-span-2' : '';
                    html += `
                        <div class="w-full h-full overflow-hidden bg-surface-container rounded-sm ${colClass}">
                            <img class="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-1000 ease-out" src="${url}" alt="Secondary Visual">
                        </div>
                    `;
                });
                galleryContainer.innerHTML = html;
            }

            // Staggered reveal effect
            setTimeout(() => {
                document.getElementById('project-container').classList.remove('opacity-0');
            }, 100);
            
        } else {
            console.error("No such project!");
            window.location.replace('index.html');
        }
    } catch (err) {
        console.error("Error fetching project:", err);
        window.location.replace('index.html');
    }
});
