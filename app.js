import { db, storage, collection, addDoc, ref, uploadBytes, getDownloadURL, serverTimestamp } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    const appRoot = document.getElementById('app-root');
    const navLinks = document.querySelectorAll('.nav-link');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');

    // Drawer toggle for mobile
    menuToggle.addEventListener('click', () => {
        if (sidebar.classList.contains('-translate-x-full')) {
            sidebar.classList.remove('-translate-x-full');
        } else {
            sidebar.classList.add('-translate-x-full');
        }
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth < 768) {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target) && !sidebar.classList.contains('-translate-x-full')) {
                sidebar.classList.add('-translate-x-full');
            }
        }
    });

    const routes = {
        'dashboard': 'tpl-dashboard',
        'add-project': 'tpl-add-project',
        'gallery': 'tpl-gallery'
    };

    function updateActiveNav(path) {
        navLinks.forEach(link => {
            const linkPath = link.getAttribute('data-path');
            if (path === linkPath) {
                link.classList.remove('text-stone-400', 'dark:text-stone-600');
                link.classList.add('text-black', 'dark:text-white', 'bg-stone-100', 'dark:bg-stone-800', 'border-l-2', 'border-black', 'dark:border-white');
            } else {
                link.classList.add('text-stone-400', 'dark:text-stone-600');
                link.classList.remove('text-black', 'dark:text-white', 'bg-stone-100', 'dark:bg-stone-800', 'border-l-2', 'border-black', 'dark:border-white');
            }
        });
    }

    function initRouteLogic(hash) {
        if (hash === 'add-project') {
            const form = document.getElementById('add-project-form');
            const fileInput = document.getElementById('proj-image');
            const fileLabel = document.getElementById('proj-image-label');
            const statusDiv = document.getElementById('upload-status');
            const submitBtn = document.getElementById('submit-project-btn');

            if (fileInput) {
                const dropZone = fileInput.parentElement;
                fileInput.addEventListener('change', (e) => {
                    if (e.target.files.length > 0) {
                        const file = e.target.files[0];
                        fileLabel.textContent = file.name;
                        
                        // Show image preview
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            dropZone.style.backgroundImage = `url(${event.target.result})`;
                            dropZone.style.backgroundSize = 'cover';
                            dropZone.style.backgroundPosition = 'center';
                        };
                        reader.readAsDataURL(file);
                    } else {
                        fileLabel.textContent = 'Drop primary visual here';
                        dropZone.style.backgroundImage = 'none';
                    }
                });
            }

            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Publishing...';
                    statusDiv.classList.remove('hidden', 'text-red-600', 'text-green-600');
                    statusDiv.classList.add('text-stone-500');
                    statusDiv.textContent = 'Starting upload...';

                    try {
                        const title = document.getElementById('proj-title').value;
                        const category = document.getElementById('proj-category').value;
                        const narrative = document.getElementById('proj-narrative').value;
                        const file = fileInput.files[0];

                        // 1. Upload Image
                        statusDiv.textContent = 'Uploading imagery...';
                        const imageRef = ref(storage, `projects/${Date.now()}_${file.name}`);
                        await uploadBytes(imageRef, file);
                        const imageUrl = await getDownloadURL(imageRef);

                        // 2. Save Document
                        statusDiv.textContent = 'Saving narrative...';
                        await addDoc(collection(db, 'projects'), {
                            title,
                            category,
                            narrative,
                            imageUrl,
                            createdAt: serverTimestamp(),
                            published: true
                        });

                        statusDiv.classList.replace('text-stone-500', 'text-green-600');
                        statusDiv.textContent = 'Project successfully published!';
                        
                        // Reset form and return to dashboard
                        form.reset();
                        fileLabel.textContent = 'Drop primary visual here';
                        fileInput.parentElement.style.backgroundImage = 'none';
                        setTimeout(() => {
                            window.location.hash = 'dashboard';
                        }, 1500);

                    } catch (error) {
                        console.error('Error adding project:', error);
                        statusDiv.classList.replace('text-stone-500', 'text-red-600');
                        statusDiv.textContent = 'Error: ' + error.message;
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Publish Project';
                    }
                });
            }
        }
    }

    function renderPage() {
        let hash = window.location.hash.substring(1);
        if (!hash || !routes[hash]) {
            hash = 'dashboard';
        }

        const templateId = routes[hash];
        const template = document.getElementById(templateId);
        
        if (template) {
            // Remove old content completely for smooth redraws
            appRoot.innerHTML = '';
            const clone = template.content.cloneNode(true);
            appRoot.appendChild(clone);
            updateActiveNav(hash);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            initRouteLogic(hash);

            // Auto close sidebar on mobile when navigating
            if (window.innerWidth < 768) {
                sidebar.classList.add('-translate-x-full');
            }
        }
    }

    window.addEventListener('hashchange', renderPage);
    // Initial render
    renderPage();
});
