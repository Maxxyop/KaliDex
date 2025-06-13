// Performance optimizations and utilities
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
};

// Document fragment for efficient DOM manipulation
const createDocumentFragment = () => document.createDocumentFragment();

// Cache DOM elements
const container = document.getElementById('main');
let toolsData = null;
let isLoading = false;

// Optimized tool creation function
function createToolElement(tool) {
  const toolDiv = document.createElement('div');
  toolDiv.classList.add('tool-item');
  
  // Use template literals more efficiently
  const commandsHTML = tool.commands.map(cmd => 
    `<div class="command-item">
      <span class="highlight">${cmd.command}</span> - ${cmd.explanation}
    </div>`
  ).join('');
  
  toolDiv.innerHTML = `
    <h3>${tool.name}</h3>
    <p>${tool.description}</p>
    ${commandsHTML}
  `;
  
  return toolDiv;
}

// Optimized category creation function
function createCategoryElement(category, tools) {
  const catDiv = document.createElement('div');
  catDiv.classList.add('category-container');
  catDiv.dataset.category = category.toLowerCase();
  
  const categoryHeader = document.createElement('h2');
  categoryHeader.textContent = category;
  categoryHeader.classList.add('category-header');
  catDiv.appendChild(categoryHeader);
  
  // Use document fragment for better performance
  const fragment = createDocumentFragment();
  
  tools.forEach(tool => {
    const toolElement = createToolElement(tool);
    fragment.appendChild(toolElement);
  });
  
  catDiv.appendChild(fragment);
  return catDiv;
}

// Virtual scrolling implementation for large datasets
class VirtualScroller {
  constructor(container, itemHeight = 100, buffer = 5) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.buffer = buffer;
    this.scrollTop = 0;
    this.containerHeight = container.clientHeight;
    this.items = [];
    this.visibleItems = new Map();
    
    this.setupScrollListener();
  }
  
  setupScrollListener() {
    const scrollHandler = throttle(() => {
      this.scrollTop = this.container.scrollTop;
      this.updateVisibleItems();
    }, 16); // ~60fps
    
    this.container.addEventListener('scroll', scrollHandler, { passive: true });
  }
  
  updateVisibleItems() {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight) - this.buffer;
    const endIndex = Math.ceil((this.scrollTop + this.containerHeight) / this.itemHeight) + this.buffer;
    
    // Remove items that are no longer visible
    this.visibleItems.forEach((element, index) => {
      if (index < startIndex || index > endIndex) {
        element.style.display = 'none';
        this.visibleItems.delete(index);
      }
    });
    
    // Add newly visible items
    for (let i = Math.max(0, startIndex); i <= Math.min(this.items.length - 1, endIndex); i++) {
      if (!this.visibleItems.has(i)) {
        const element = this.items[i];
        element.style.display = 'block';
        element.style.transform = `translateY(${i * this.itemHeight}px)`;
        this.visibleItems.set(i, element);
      }
    }
  }
}

// Optimized search functionality
function createSearchFunction(data) {
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results') || createSearchResultsContainer();
  
  if (!searchInput) return;
  
  const performSearch = debounce((query) => {
    if (!query.trim()) {
      showAllCategories();
      return;
    }
    
    const results = searchTools(data, query);
    displaySearchResults(results, searchResults);
  }, 300);
  
  searchInput.addEventListener('input', (e) => {
    performSearch(e.target.value);
  });
}

function createSearchResultsContainer() {
  const searchResults = document.createElement('div');
  searchResults.id = 'search-results';
  searchResults.classList.add('search-results-container');
  container.parentNode.insertBefore(searchResults, container);
  return searchResults;
}

function searchTools(data, query) {
  const results = [];
  const queryLower = query.toLowerCase();
  
  Object.entries(data).forEach(([category, tools]) => {
    tools.forEach(tool => {
      let score = 0;
      
      // Weighted scoring system
      if (tool.name.toLowerCase().includes(queryLower)) score += 10;
      if (tool.description.toLowerCase().includes(queryLower)) score += 5;
      
      tool.commands.forEach(cmd => {
        if (cmd.command.toLowerCase().includes(queryLower)) score += 8;
        if (cmd.explanation.toLowerCase().includes(queryLower)) score += 3;
      });
      
      if (score > 0) {
        results.push({ tool, category, score });
      }
    });
  });
  
  return results.sort((a, b) => b.score - a.score);
}

function displaySearchResults(results, container) {
  // Use requestAnimationFrame for smooth rendering
  requestAnimationFrame(() => {
    container.innerHTML = '';
    
    if (results.length === 0) {
      container.innerHTML = '<div class="no-results">No tools found matching your search.</div>';
      showSearchResults();
      return;
    }
    
    const fragment = createDocumentFragment();
    const maxResults = 50; // Limit results for performance
    
    results.slice(0, maxResults).forEach(({ tool, category }) => {
      const resultDiv = document.createElement('div');
      resultDiv.classList.add('search-result-item', 'tool-item');
      resultDiv.innerHTML = `
        <div class="result-category">${category}</div>
        <h3>${tool.name}</h3>
        <p>${tool.description}</p>
        ${tool.commands.map(cmd => 
          `<div class="command-item">
            <span class="highlight">${cmd.command}</span> - ${cmd.explanation}
          </div>`
        ).join('')}
      `;
      fragment.appendChild(resultDiv);
    });
    
    container.appendChild(fragment);
    showSearchResults();
  });
}

function showSearchResults() {
  container.style.display = 'none';
  document.getElementById('search-results').style.display = 'block';
}

function showAllCategories() {
  container.style.display = 'block';
  const searchResults = document.getElementById('search-results');
  if (searchResults) {
    searchResults.style.display = 'none';
  }
}

// Intersection Observer for lazy loading
function setupLazyLoading() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    rootMargin: '50px',
    threshold: 0.1
  });
  
  document.querySelectorAll('.tool-item').forEach(item => {
    observer.observe(item);
  });
}

// Optimized main loading function
async function loadTools() {
  if (isLoading) return;
  isLoading = true;
  
  try {
    // Show loading indicator
    container.innerHTML = '<div class="loading">Loading tools...</div>';
    
    const response = await fetch("data/tools.json");
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    toolsData = data;
    
    // Use requestAnimationFrame for smooth rendering
    requestAnimationFrame(() => {
      renderCategories(data);
      setupLazyLoading();
      createSearchFunction(data);
      isLoading = false;
    });
    
  } catch (error) {
    console.error('Error loading tools:', error);
    container.innerHTML = '<div class="error">Error loading tools. Please try again later.</div>';
    isLoading = false;
  }
}

function renderCategories(data) {
  container.innerHTML = '';
  const fragment = createDocumentFragment();
  
  Object.entries(data).forEach(([category, tools]) => {
    const categoryElement = createCategoryElement(category, tools);
    fragment.appendChild(categoryElement);
  });
  
  container.appendChild(fragment);
}

// Category filtering with smooth animations
function filterByCategory(selectedCategory) {
  const categories = document.querySelectorAll('.category-container');
  
  categories.forEach(catDiv => {
    const category = catDiv.dataset.category;
    
    if (selectedCategory === 'all' || category === selectedCategory.toLowerCase()) {
      catDiv.style.display = 'block';
      catDiv.classList.add('fade-in');
    } else {
      catDiv.classList.add('fade-out');
      setTimeout(() => {
        catDiv.style.display = 'none';
        catDiv.classList.remove('fade-out');
      }, 300);
    }
  });
}

// Smooth scroll to category
function scrollToCategory(category) {
  const categoryElement = document.querySelector(`[data-category="${category.toLowerCase()}"]`);
  if (categoryElement) {
    categoryElement.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  }
}

// Memory cleanup function
function cleanup() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.removeEventListener('input', performSearch);
  }
}

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
  loadTools();
});

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);

// Export functions for external use
window.KaliDex = {
  filterByCategory,
  scrollToCategory,
  searchTools: (query) => searchTools(toolsData, query),
  refresh: loadTools
};
