// register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js', { scope: '/csv-viewer/' })
    .then(reg => console.log('service worker registered', reg))
    .catch(err => console.log('service worker registration failed', err));
}

// state
let csvData = [];
let filteredData = [];
let currentPage = 1;
let rowsPerPage = 100;
let sortColumn = null;
let sortDirection = 'asc';
let currentFileName = '';

// dom elements
const dropZone = document.getElementById('dropZone');
const tableContainer = document.getElementById('tableContainer');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const rowCount = document.getElementById('rowCount');
const columnCount = document.getElementById('columnCount');
const fileInput = document.getElementById('fileInput');
const openFileBtn = document.getElementById('openFile');
const exportFilteredBtn = document.getElementById('exportFiltered');
const toggleThemeBtn = document.getElementById('toggleTheme');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const tableHead = document.getElementById('tableHead');
const tableBody = document.getElementById('tableBody');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');
const statsContainer = document.getElementById('statsContainer');
const columnStatsModal = document.getElementById('columnStats');
const statsColumnName = document.getElementById('statsColumnName');
const statsContent = document.getElementById('statsContent');
const closeStatsBtn = document.getElementById('closeStats');
const loadingOverlay = document.getElementById('loadingOverlay');
const rowsPerPageSelect = document.getElementById('rowsPerPage');
const resetAllBtn = document.getElementById('resetAll');

// theme handling
let isDarkMode = true;
toggleThemeBtn.addEventListener('click', () => {
  isDarkMode = !isDarkMode;
  document.body.classList.toggle('light-theme', !isDarkMode);
});

// file handling api
if ('launchQueue' in window) {
  console.log('file handling api supported');
  window.launchQueue.setConsumer(async (launchParams) => {
    if (!launchParams.files.length) return;
    const fileHandle = launchParams.files[0];
    const file = await fileHandle.getFile();
    await loadCSVFile(file);
  });
}

// manual file selection
openFileBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) await loadCSVFile(file);
});

// drag and drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) await loadCSVFile(file);
});

// load csv file
async function loadCSVFile(file) {
  currentFileName = file.name;
  loadingOverlay.style.display = 'flex';

  const text = await file.text();

  // yield to browser so the overlay paints before parsing blocks
  await new Promise(r => setTimeout(r, 0));

  Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      csvData = results.data;
      filteredData = [...csvData];
      currentPage = 1;
      sortColumn = null;
      sortDirection = 'asc';
      searchInput.value = '';

      updateUI();
      renderTable();

      // show table, hide drop zone
      dropZone.style.display = 'none';
      tableContainer.style.display = 'block';
      fileInfo.style.display = 'flex';
      exportFilteredBtn.style.display = 'inline-block';

      document.title = `${file.name} - CSV Viewer`;
      loadingOverlay.style.display = 'none';
    },
    error: (error) => {
      loadingOverlay.style.display = 'none';
      alert('error parsing csv: ' + error.message);
    }
  });
}

// update ui info
function updateUI() {
  fileName.textContent = currentFileName;
  rowCount.textContent = `${filteredData.length} rows`;
  columnCount.textContent = `${Object.keys(csvData[0] || {}).length} columns`;
  
  // update stats
  const totalRows = csvData.length;
  const filteredRows = filteredData.length;
  statsContainer.textContent = filteredRows < totalRows
    ? `Showing ${filteredRows} of ${totalRows} rows`
    : `${totalRows} rows total`;

  updateResetButton();
}

// render table
function renderTable() {
  if (filteredData.length === 0) {
    tableHead.innerHTML = '';
    tableBody.innerHTML = '<tr><td colspan="100">No data to display</td></tr>';
    return;
  }
  
  const headers = Object.keys(filteredData[0]);
  
  // render header
  tableHead.innerHTML = `
    <tr role="row">
      ${headers.map((header, i) => {
        const isSorted = sortColumn === i;
        const ariaSortVal = isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none';
        return `
        <th data-column="${i}" role="columnheader" aria-sort="${ariaSortVal}" class="${isSorted ? 'sorted sorted-' + sortDirection : ''}">
          <div class="th-content">
            <span>${escapeHtml(header)}</span>
            <span class="sort-indicator" aria-hidden="true">${isSorted ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span>
          </div>
          <button class="stats-btn" data-column="${i}" title="Show statistics for ${escapeHtml(header)}" aria-label="Show statistics for ${escapeHtml(header)}">📊</button>
        </th>`;
      }).join('')}
    </tr>
  `;
  
  // add header click handlers
  tableHead.querySelectorAll('th').forEach((th, i) => {
    th.addEventListener('click', (e) => {
      if (!e.target.classList.contains('stats-btn')) {
        handleSort(i);
      }
    });
  });
  
  // add stats button handlers
  tableHead.querySelectorAll('.stats-btn').forEach((btn, i) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showColumnStats(headers[i]);
    });
  });
  
  // pagination
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageData = filteredData.slice(start, end);
  
  // render body
  tableBody.innerHTML = pageData.map(row => `
    <tr>
      ${headers.map(header => `
        <td>${escapeHtml(String(row[header] || ''))}</td>
      `).join('')}
    </tr>
  `).join('');
  
  // update pagination
  updatePagination();
}

// apply current filter and sort to produce filteredData
function applyFilterAndSort() {
  const query = searchInput.value.toLowerCase();

  // filter from original data
  if (!query) {
    filteredData = [...csvData];
  } else {
    filteredData = csvData.filter(row =>
      Object.values(row).some(val =>
        String(val).toLowerCase().includes(query)
      )
    );
  }

  // apply sort if active
  if (sortColumn !== null && filteredData.length > 0) {
    const headers = Object.keys(filteredData[0]);
    const column = headers[sortColumn];

    filteredData.sort((a, b) => {
      let aVal = a[column];
      let bVal = b[column];

      const aNum = parseFloat(String(aVal).replace(/,/g, ''));
      const bNum = parseFloat(String(bVal).replace(/,/g, ''));

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }

      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();

      if (sortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }
}

// handle sorting
function handleSort(columnIndex) {
  if (sortColumn === columnIndex) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn = columnIndex;
    sortDirection = 'asc';
  }

  applyFilterAndSort();
  currentPage = 1;
  updateUI();
  renderTable();
}

// search/filter
searchInput.addEventListener('input', () => {
  applyFilterAndSort();
  currentPage = 1;
  updateUI();
  renderTable();
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  applyFilterAndSort();
  currentPage = 1;
  updateUI();
  renderTable();
});

// pagination
function updatePagination() {
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
}

prevPageBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderTable();
    window.scrollTo(0, 0);
  }
});

nextPageBtn.addEventListener('click', () => {
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderTable();
    window.scrollTo(0, 0);
  }
});

rowsPerPageSelect.addEventListener('change', (e) => {
  rowsPerPage = parseInt(e.target.value, 10);
  currentPage = 1;
  renderTable();
});

// reset all filters, sort, and search
resetAllBtn.addEventListener('click', () => {
  searchInput.value = '';
  sortColumn = null;
  sortDirection = 'asc';
  applyFilterAndSort();
  currentPage = 1;
  updateUI();
  renderTable();
});

// show/hide Reset All button when filters or sort are active
function updateResetButton() {
  const hasSearch = searchInput.value.length > 0;
  const hasSort = sortColumn !== null;
  resetAllBtn.style.display = (hasSearch || hasSort) ? 'inline-block' : 'none';
}

// column statistics
function showColumnStats(columnName) {
  const values = filteredData.map(row => row[columnName]).filter(v => v !== '' && v !== null && v !== undefined);
  
  statsColumnName.textContent = columnName;
  
  // try to parse as numbers
  const numbers = values.map(v => parseFloat(v)).filter(n => !isNaN(n));
  
  let html = `<div class="stat-group">`;
  html += `<div class="stat"><label>Total values:</label><span>${values.length}</span></div>`;
  html += `<div class="stat"><label>Unique values:</label><span>${new Set(values).size}</span></div>`;
  html += `<div class="stat"><label>Empty values:</label><span>${filteredData.length - values.length}</span></div>`;
  
  if (numbers.length > 0) {
    const sum = numbers.reduce((a, b) => a + b, 0);
    const avg = sum / numbers.length;
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const sorted = [...numbers].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    
    html += `<div class="stat"><label>Sum:</label><span>${sum.toLocaleString()}</span></div>`;
    html += `<div class="stat"><label>Average:</label><span>${avg.toFixed(2)}</span></div>`;
    html += `<div class="stat"><label>Median:</label><span>${median.toFixed(2)}</span></div>`;
    html += `<div class="stat"><label>Min:</label><span>${min.toLocaleString()}</span></div>`;
    html += `<div class="stat"><label>Max:</label><span>${max.toLocaleString()}</span></div>`;
  }
  
  html += `</div>`;
  
  // most common values
  const valueCounts = {};
  values.forEach(v => valueCounts[v] = (valueCounts[v] || 0) + 1);
  const topValues = Object.entries(valueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  if (topValues.length > 0) {
    html += `<h4>Top Values</h4><div class="stat-group">`;
    topValues.forEach(([value, count]) => {
      const percentage = ((count / values.length) * 100).toFixed(1);
      html += `<div class="stat"><label>${escapeHtml(String(value))}:</label><span>${count} (${percentage}%)</span></div>`;
    });
    html += `</div>`;
  }
  
  statsContent.innerHTML = html;
  columnStatsModal.style.display = 'flex';
  closeStatsBtn.focus();
}

closeStatsBtn.addEventListener('click', () => {
  columnStatsModal.style.display = 'none';
});

columnStatsModal.addEventListener('click', (e) => {
  if (e.target === columnStatsModal) {
    columnStatsModal.style.display = 'none';
  }
});

// export filtered data
exportFilteredBtn.addEventListener('click', () => {
  const csv = Papa.unparse(filteredData);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = currentFileName.replace(/\.[^.]+$/, '_filtered.csv');
  a.click();
  URL.revokeObjectURL(url);
});

// keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
    e.preventDefault();
    fileInput.click();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    searchInput.focus();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
    e.preventDefault();
    toggleThemeBtn.click();
  }
  if (e.key === 'Escape' && columnStatsModal.style.display === 'flex') {
    columnStatsModal.style.display = 'none';
  }
});

// utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

console.log('csv viewer initialized');
