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
        'home': 'tpl-home',
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

    function renderPage() {
        let hash = window.location.hash.substring(1);
        if (!hash || !routes[hash]) {
            hash = 'home';
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
