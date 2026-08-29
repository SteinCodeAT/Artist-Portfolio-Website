/** Admin post list search + pagination for AdminPostList.astro */

const DEFAULT_PAGE_SIZE = 10;

function normalize(value: string): string {
	return value.trim().toLowerCase();
}

function formatListMeta(
	total: number,
	visible: number,
	page: number,
	totalPages: number,
	itemLabel: string,
): string {
	if (total === 0) return `Keine ${itemLabel}`;
	if (totalPages <= 1) return `${visible} von ${total} ${itemLabel}`;
	return `${visible} auf Seite ${page} · ${total} gesamt`;
}

function initEventList() {
	const listRoot = document.getElementById('posts-list');
	const searchInput = document.getElementById('posts-search') as HTMLInputElement | null;
	const countEl = document.getElementById('posts-count');
	const paginationEl = document.getElementById('posts-pagination');

	if (!listRoot) return;

	const itemLabel = listRoot.dataset.itemLabel ?? 'Einträge';
	const pageSize = Number(listRoot.dataset.pageSize ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE;
	const cards = Array.from(listRoot.querySelectorAll<HTMLElement>('[data-post-card]'));
	const headings = Array.from(listRoot.querySelectorAll<HTMLElement>('[data-list-heading]'));
	let searchQuery = '';
	let currentPage = 1;

	function matchesSearch(card: HTMLElement): boolean {
		if (!searchQuery) return true;
		const title = normalize(card.dataset.title ?? '');
		const description = normalize(card.dataset.description ?? '');
		return title.includes(searchQuery) || description.includes(searchQuery);
	}

	function getMatchingCards(): HTMLElement[] {
		return cards.filter(matchesSearch);
	}

	function renderPagination(totalPages: number) {
		if (!paginationEl) return;

		if (totalPages <= 1) {
			paginationEl.innerHTML = '';
			return;
		}

		const parts: string[] = [];
		for (let page = 1; page <= totalPages; page += 1) {
			parts.push(
				`<button type="button" class="posts-page-btn${page === currentPage ? ' is-active' : ''}" data-posts-page="${page}">${page}</button>`,
			);
		}

		paginationEl.innerHTML = parts.join('');

		paginationEl.querySelectorAll<HTMLButtonElement>('[data-posts-page]').forEach((button) => {
			button.addEventListener('click', () => {
				currentPage = Number(button.dataset.postsPage ?? '1');
				render();
			});
		});
	}

	function render() {
		const matching = getMatchingCards();
		const matchingUpcoming = matching.filter((card) => card.dataset.postGroup === 'upcoming');
		const matchingArchive = matching.filter((card) => card.dataset.postGroup !== 'upcoming');
		const totalPages = Math.max(1, Math.ceil(matchingArchive.length / pageSize));

		if (currentPage > totalPages) {
			currentPage = totalPages;
		}

		const start = (currentPage - 1) * pageSize;
		const pageArchive = matchingArchive.slice(start, start + pageSize);
		const visibleIds = new Set([
			...matchingUpcoming.map((card) => card.dataset.postId),
			...pageArchive.map((card) => card.dataset.postId),
		]);

		cards.forEach((card) => {
			const show = visibleIds.has(card.dataset.postId);
			card.classList.toggle('is-hidden', !show);
			card.hidden = !show;
		});

		headings.forEach((heading) => {
			const group = heading.dataset.listHeading;
			const hasVisible =
				group === 'upcoming' ? matchingUpcoming.length > 0 : matchingArchive.length > 0;
			heading.classList.toggle('is-hidden', !hasVisible);
			heading.hidden = !hasVisible;
		});

		if (countEl) {
			countEl.textContent = formatListMeta(
				matching.length,
				matchingUpcoming.length + pageArchive.length,
				currentPage,
				totalPages,
				itemLabel,
			);
		}

		renderPagination(totalPages);
	}

	searchInput?.addEventListener('input', () => {
		searchQuery = normalize(searchInput.value);
		currentPage = 1;
		render();
	});

	render();
}

initEventList();

export {};
