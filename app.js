import { db, storage, collection, addDoc, ref, uploadBytes, getDownloadURL, serverTimestamp, doc, deleteDoc, updateDoc, getDocs, orderBy, query, getDoc } from './firebase-config.js';

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
        'gallery': 'tpl-gallery',
        'profile': 'tpl-profile'
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

    function initRouteLogic(hash, queryString) {
        if (hash === 'gallery') {
            const tbody = document.getElementById('projects-table-body');
            if(tbody) {
                const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
                getDocs(q).then(snapshot => {
                    if(snapshot.empty) {
                        tbody.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-sm text-stone-400 font-bold uppercase tracking-widest">No projects found.</td></tr>`;
                        return;
                    }
                    let html = '';
                    snapshot.forEach(docSnap => {
                        const data = docSnap.data();
                        const id = docSnap.id;
                        const date = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : 'N/A';
                        html += `
                        <tr class="group hover:bg-stone-50 transition-colors">
                            <td class="py-4 px-6 border-b border-stone-100">
                                <div class="w-16 h-10 bg-stone-200 rounded-sm overflow-hidden bg-cover bg-center" style="background-image: url('${data.imageUrl}')"></div>
                            </td>
                            <td class="py-4 px-6 border-b border-stone-100">
                                <p class="font-bold text-sm tracking-tight">${data.title}</p>
                                <p class="text-[10px] uppercase tracking-widest text-stone-400 mt-1">${date}</p>
                            </td>
                            <td class="py-4 px-6 border-b border-stone-100 hidden md:table-cell">
                                <span class="bg-surface-container-high px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest">${data.category}</span>
                            </td>
                            <td class="py-4 px-6 border-b border-stone-100 hidden sm:table-cell">
                                <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full ${data.published ? 'bg-green-500' : 'bg-stone-300'}"></span><span class="text-[10px] uppercase font-bold tracking-widest text-stone-500">${data.published ? 'Published' : 'Draft'}</span></div>
                            </td>
                            <td class="py-4 px-6 border-b border-stone-100 text-right">
                                <div class="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onclick="window.location.hash='add-project?id=${id}'" class="text-stone-400 hover:text-black transition-colors" title="Edit"><span class="material-symbols-outlined text-[18px]">edit</span></button>
                                    <button data-delete-id="${id}" class="delete-btn text-stone-400 hover:text-red-600 transition-colors" title="Delete"><span class="material-symbols-outlined text-[18px]">delete</span></button>
                                </div>
                            </td>
                        </tr>`;
                    });
                    tbody.innerHTML = html;

                    document.querySelectorAll('.delete-btn').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            const id = e.currentTarget.getAttribute('data-delete-id');
                            if(confirm("Are you sure you want to permanently delete this project?")) {
                                try {
                                    await deleteDoc(doc(db, 'projects', id));
                                    initRouteLogic('gallery'); // refresh table
                                } catch(err) {
                                    alert("Error deleting: " + err.message);
                                }
                            }
                        });
                    });
                });
            }
        }
        if (hash === 'add-project') {
            const form = document.getElementById('add-project-form');
            const fileInput = document.getElementById('proj-image');
            const fileLabel = document.getElementById('proj-image-label');
            const galleryInput = document.getElementById('proj-gallery');
            const galleryLabel = document.getElementById('proj-gallery-label');
            const statusDiv = document.getElementById('upload-status');
            const submitBtn = document.getElementById('submit-project-btn');

            let editingId = null;
            if (queryString && queryString.startsWith('id=')) {
                editingId = queryString.split('=')[1];
            }

            if (editingId) {
                // Populate form for editing
                document.querySelector('h2').textContent = 'Edit Project';
                submitBtn.textContent = 'Update Project';
                getDoc(doc(db, 'projects', editingId)).then(docSnap => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        document.getElementById('proj-title').value = data.title || '';
                        document.getElementById('proj-category').value = data.category || '';
                        document.getElementById('proj-narrative').value = data.narrative || '';
                        if(data.imageUrl) {
                            fileInput.parentElement.style.backgroundImage = `url(${data.imageUrl})`;
                            fileInput.parentElement.style.backgroundSize = 'cover';
                            fileInput.parentElement.style.backgroundPosition = 'center';
                            fileInput.removeAttribute('required');
                            fileLabel.textContent = 'Keep existing or drop new visual';
                        }
                        if(data.galleryUrls && data.galleryUrls.length > 0) {
                            galleryLabel.textContent = `${data.galleryUrls.length} secondary visual(s) saved (Upload new to replace)`;
                        }
                        if(data.videoUrl) {
                            document.getElementById('proj-video').value = data.videoUrl;
                        }
                        if(data.websiteUrl) {
                            document.getElementById('proj-website').value = data.websiteUrl;
                        }
                    }
                });
            } else {
                // Don't enforce required on file input — user may only paste a video URL
            }

            if (galleryInput) {
                galleryInput.addEventListener('change', (e) => {
                    const count = e.target.files.length;
                    if (count > 0) {
                        galleryLabel.textContent = `${count} secondary visual(s) selected`;
                    } else {
                        galleryLabel.textContent = 'Drop multiple secondary visuals here';
                    }
                });
            }

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
                        const videoUrl = document.getElementById('proj-video').value.trim();
                        const websiteUrl = document.getElementById('proj-website').value.trim();
                        const file = fileInput.files[0];

                        // 1. Upload Image (only if a new one is selected)
                        let imageUrl = null;
                        if (fileInput.files.length > 0) {
                            statusDiv.textContent = 'Uploading primary imagery...';
                            const file = fileInput.files[0];
                            const imageRef = ref(storage, `projects/${Date.now()}_${file.name}`);
                            await uploadBytes(imageRef, file);
                            imageUrl = await getDownloadURL(imageRef);
                        }

                        // 1.5. Upload Gallery Images (only if selected)
                        let galleryUrls = null;
                        if (galleryInput && galleryInput.files.length > 0) {
                            statusDiv.textContent = 'Uploading secondary visual(s)...';
                            galleryUrls = [];
                            const galleryFiles = Array.from(galleryInput.files);
                            for (let i = 0; i < galleryFiles.length; i++) {
                                const gFile = galleryFiles[i];
                                const gImageRef = ref(storage, `projects/${Date.now()}_gallery_${i}_${gFile.name}`);
                                await uploadBytes(gImageRef, gFile);
                                const gUrl = await getDownloadURL(gImageRef);
                                galleryUrls.push(gUrl);
                            }
                        }

                        // 2. Save Document
                        statusDiv.textContent = 'Saving narrative...';
                        if (editingId) {
                            const updateData = {
                                title,
                                category,
                                narrative,
                                videoUrl,
                                websiteUrl
                            };
                            if (imageUrl) updateData.imageUrl = imageUrl;
                            if (galleryUrls) updateData.galleryUrls = galleryUrls;
                            
                            await updateDoc(doc(db, 'projects', editingId), updateData);
                            statusDiv.classList.replace('text-stone-500', 'text-green-600');
                            statusDiv.textContent = 'Project successfully updated!';
                        } else {
                            await addDoc(collection(db, 'projects'), {
                                title,
                                category,
                                narrative,
                                imageUrl,
                                galleryUrls: galleryUrls || [],
                                videoUrl,
                                websiteUrl,
                                createdAt: serverTimestamp(),
                                published: true
                            });
                            statusDiv.classList.replace('text-stone-500', 'text-green-600');
                            statusDiv.textContent = 'Project successfully published!';
                        }
                        
                        // Reset form and return to dashboard
                        form.reset();
                        fileLabel.textContent = 'Drop primary visual here';
                        if(galleryInput) galleryLabel.textContent = 'Drop multiple secondary visuals here';
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
        if (hash === 'profile') {
            const form = document.getElementById('profile-form');
            const nameInput = document.getElementById('profile-name');
            const avatarInput = document.getElementById('profile-avatar-input');
            const avatarImg = document.getElementById('profile-avatar-img');
            const statusEl = document.getElementById('profile-status');

            // Load existing profile
            getDoc(doc(db, 'settings', 'profile')).then(docSnap => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.displayName) nameInput.value = data.displayName;
                    if (data.avatarUrl) avatarImg.src = data.avatarUrl;
                }
            });

            // Preview avatar on file select
            avatarInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => { avatarImg.src = ev.target.result; };
                    reader.readAsDataURL(file);
                }
            });

            // Save profile
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                statusEl.classList.remove('hidden', 'text-red-600', 'text-green-600');
                statusEl.classList.add('text-stone-500');
                statusEl.textContent = 'Saving...';

                try {
                    const updateData = { displayName: nameInput.value.trim() };

                    if (avatarInput.files.length > 0) {
                        const file = avatarInput.files[0];
                        const avatarRef = ref(storage, `profile/avatar_${Date.now()}_${file.name}`);
                        await uploadBytes(avatarRef, file);
                        updateData.avatarUrl = await getDownloadURL(avatarRef);
                    }

                    const { setDoc } = await import('https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js');
                    await setDoc(doc(db, 'settings', 'profile'), updateData, { merge: true });

                    statusEl.classList.replace('text-stone-500', 'text-green-600');
                    statusEl.textContent = 'Profile saved successfully!';
                } catch (error) {
                    console.error('Error saving profile:', error);
                    statusEl.classList.replace('text-stone-500', 'text-red-600');
                    statusEl.textContent = 'Error: ' + error.message;
                }
            });
        }
    }

    function renderPage() {
        let rawHash = window.location.hash.substring(1);
        let [hash, queryString] = rawHash.split('?');
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
            
            initRouteLogic(hash, queryString);

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
