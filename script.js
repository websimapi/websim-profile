const projectsGrid = document.getElementById('projects-grid');
const loader = document.getElementById('loader');
const userProfileContainer = document.getElementById('user-profile');
const iframeModal = document.getElementById('iframe-modal');
const projectIframe = document.getElementById('project-iframe');
const closeIframeBtn = document.getElementById('close-iframe');

let currentUser = null;
let nextCursor = null;
let isLoading = false;
let hasMore = true;
let isLoaderVisible = false;

async function fetchProjects(cursor = null) {
    if (isLoading || !hasMore) return;
    isLoading = true;
    loader.classList.add('visible');

    try {
        if (!currentUser) {
            const user = await window.websim.getCreator();
            if (!user || !user.username) {
                console.error("Could not determine a valid creator for this page.");
                userProfileContainer.innerHTML = '<h1>Creator not found</h1>';
                projectsGrid.innerHTML = '<h2>Could not load creator profile.</h2>';
                hasMore = false;
                loader.style.display = 'none';
                return;
            }
            currentUser = user;
            displayUserProfile(currentUser);
        }
    
        let url = `/api/v1/users/${currentUser.username}/projects?posted=true&first=24`;
        if (cursor) {
            url += `&after=${cursor}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        const { projects } = data;
        
        if (projects.data && projects.data.length > 0) {
            const fragment = document.createDocumentFragment();
            projects.data.forEach(item => {
                const projectCard = createProjectCard(item);
                if(projectCard) fragment.appendChild(projectCard);
            });
            projectsGrid.appendChild(fragment);
            nextCursor = projects.meta.end_cursor;
            hasMore = projects.meta.has_next_page;
        } else {
            hasMore = false;
        }

    } catch (error) {
        console.error('Error fetching projects:', error);
        projectsGrid.innerHTML += '<p>Failed to load projects. Please try again later.</p>';
        hasMore = false;
    } finally {
        isLoading = false;
        if (!hasMore) {
            loader.style.display = 'none';
        } else {
            loader.classList.remove('visible');
            // If the loader is still visible (didn't load enough to fill screen), fetch again automatically
            if (isLoaderVisible) {
                fetchProjects(nextCursor);
            }
        }
    }
}

function displayUserProfile(user) {
    if (!user || !user.username) {
        userProfileContainer.innerHTML = '<h1>Anonymous</h1>';
        return;
    }
    const profileLink = `https://websim.com/@${user.username}`;
    const avatarUrl = `https://images.websim.com/avatar/${user.username}`;

    userProfileContainer.innerHTML = `
        <a href="${profileLink}" target="_blank" title="View profile on websim.com">
            <img src="${avatarUrl}" alt="${user.username}'s profile picture">
            <h1>${user.username}'s Projects</h1>
        </a>
    `;
}

function createProjectCard({ project, project_revision, site }) {
    if (!project || !project_revision || !site) return null;

    const card = document.createElement('div');
    card.classList.add('project-card');
    card.dataset.iframeSrc = `https://websim.com${site.link_url}`;
    
    const thumbnailUrl = `https://images.websim.com/v1/site/${site.id}/600`;
    
    const date = new Date(project.created_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });

    card.innerHTML = `
        <div class="thumbnail">
            <img src="${thumbnailUrl}" alt="${project.title || 'Project thumbnail'}" loading="lazy">
        </div>
        <div class="card-content">
            <h3 class="title" title="${project.title || 'Untitled Project'}">${project.title || 'Untitled Project'}</h3>
            <p class="date">Created: ${date}</p>
            <div class="stats">
                <span>👁️ ${project.stats.views.toLocaleString()}</span>
                <span>❤️ ${project.stats.likes.toLocaleString()}</span>
                <span>🤖 ${project_revision.version}</span>
            </div>
        </div>
    `;
    return card;
}

function setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        isLoaderVisible = entry.isIntersecting;
        
        if (isLoaderVisible && !isLoading && hasMore) {
            fetchProjects(nextCursor);
        }
    }, {
        rootMargin: '400px'
    });
    observer.observe(loader);
}

function openProjectInIframe(src) {
    if (!src) return;
    projectIframe.src = src;
    iframeModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeProjectIframe() {
    projectIframe.src = 'about:blank';
    iframeModal.classList.add('hidden');
    document.body.style.overflow = '';
}

// Event Listeners
projectsGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.project-card');
    if (card && card.dataset.iframeSrc) {
        openProjectInIframe(card.dataset.iframeSrc);
    }
});

closeIframeBtn.addEventListener('click', closeProjectIframe);

iframeModal.addEventListener('click', (e) => {
    if (e.target === iframeModal) {
        closeProjectIframe();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !iframeModal.classList.contains('hidden')) {
        closeProjectIframe();
    }
});

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    fetchProjects();
    setupInfiniteScroll();
});