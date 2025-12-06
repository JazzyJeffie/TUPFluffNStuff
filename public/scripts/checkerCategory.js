import {
  getCategoriesAPI,
  addCategoryAPI,
  updateCategoryAPI,
  deleteCategoryAPI,
} from '../scripts/api/category.js';

document.addEventListener('DOMContentLoaded', () => {
  const categoryList = document.getElementById('category-list');
  const paginationContainer = document.getElementById('pagination');

  let currentPage = 1;
  const itemsPerPage = 10;
  let totalPages = 1;
  let sortAsc = true;
  let categories = [];

  // --- Sorting ---
  document.getElementById('sort-name-btn')?.addEventListener('click', () => {
    sortAsc = !sortAsc;
    fetchCategories(1);
  });

  function sortCategories() {
    categories.sort((a, b) => {
      const nameA = a.name.toUpperCase();
      const nameB = b.name.toUpperCase();
      if (nameA < nameB) return sortAsc ? -1 : 1;
      if (nameA > nameB) return sortAsc ? 1 : -1;
      return 0;
    });
  }

  // Helper to truncate text
  function truncateText(text, limit = 5) {
    if (!text) return '';
    const plain = text.replace(/<\/?[^>]+(>|$)/g, ''); // remove HTML tags
    if (plain.length <= limit) return plain;
    return plain.slice(0, limit) + '...';
  }

  // --- Fetch categories ---
  async function fetchCategories(page = 1) {
    currentPage = page;
    try {
      const data = await getCategoriesAPI({
        page,
        limit: itemsPerPage,
        sort: sortAsc ? 'asc' : 'desc',
      });
      categories = data.categories;
      totalPages = data.totalPages || 1;
      renderCategories();
      renderPagination();
    } catch (err) {
      alert(err.message);
    }
  }

  // --- Render categories ---
  function renderCategories() {
    categoryList.innerHTML = '';
    if (!categories || categories.length === 0) {
      categoryList.innerHTML = `
        <tr>
          <td colspan="3" style="text-align:center; font-style:italic; color:#666;">
            No categories found.
          </td>
        </tr>
      `;
      return;
    }

    categories.forEach(category => {
      const row = document.createElement('tr');

      const fullDesc = category.description || 'No description';
      const truncatedDesc = truncateText(fullDesc, 20);
      const isDescTruncated = fullDesc.length > 20;

      const fullName = category.name || 'No name';
      const truncatedName = truncateText(fullName, 20);
      const isNameTruncated = fullName.length > 20;

      row.innerHTML = `
    <td>
      <span class="category-name" data-full="${fullName}" data-truncated="${truncatedName}">
        ${truncatedName}
      </span>
      ${
        isNameTruncated
          ? `<button class="read-more-name-btn">Read more</button>`
          : ''
      }
      <input class="edit-name-input" type="text" value="${fullName}" style="display:none;" />
    </td>
    <td>
      <span class="category-desc" data-full="${fullDesc}" data-truncated="${truncatedDesc}">
        ${truncatedDesc}
      </span>
      ${
        isDescTruncated
          ? `<button class="read-more-desc-btn">Read more</button>`
          : ''
      }
      <input class="edit-desc-input" type="text" value="${fullDesc}" style="display:none;" />
    </td>
    <td class="action-buttons">
      <button class="edit-btn" data-id="${category._id}">Edit</button>
      <button class="save-btn" data-id="${
        category._id
      }" style="display:none;">Save</button>
      <button class="delete-btn" data-id="${category._id}">Delete</button>
    </td>
  `;
      categoryList.appendChild(row);
    });

    // --- Attach Read More for Description ---
    document.querySelectorAll('.read-more-desc-btn').forEach(button => {
      button.addEventListener('click', () => {
        const row = button.closest('tr');
        const span = row.querySelector('.category-desc');
        if (button.textContent === 'Read more') {
          span.textContent = span.dataset.full;
          button.textContent = 'Show less';
        } else {
          span.textContent = span.dataset.truncated;
          button.textContent = 'Read more';
        }
      });
    });

    // --- Attach Read More for Name ---
    document.querySelectorAll('.read-more-name-btn').forEach(button => {
      button.addEventListener('click', () => {
        const row = button.closest('tr');
        const span = row.querySelector('.category-name');
        if (button.textContent === 'Read more') {
          span.textContent = span.dataset.full;
          button.textContent = 'Show less';
        } else {
          span.textContent = span.dataset.truncated;
          button.textContent = 'Read more';
        }
      });
    });
  }

  // --- Pagination ---
  function renderPagination() {
    if (!paginationContainer) return;
    let html = '';

    html += `<button ${
      currentPage === 1 ? 'disabled' : ''
    } id="prev-btn">Prev</button>`;

    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="page-btn" ${
        i === currentPage ? 'disabled' : ''
      } data-page="${i}">${i}</button>`;
    }

    html += `<button ${
      currentPage === totalPages ? 'disabled' : ''
    } id="next-btn">Next</button>`;

    paginationContainer.innerHTML = html;

    document.getElementById('prev-btn')?.addEventListener('click', () => {
      if (currentPage > 1) fetchCategories(currentPage - 1);
    });
    document.getElementById('next-btn')?.addEventListener('click', () => {
      if (currentPage < totalPages) fetchCategories(currentPage + 1);
    });
    document.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = Number(btn.dataset.page);
        fetchCategories(page);
      });
    });
  }

  // --- Initial load ---
  fetchCategories();
});
