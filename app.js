document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    initDashboard();
    initModal();
    
    document.getElementById('monthFilter').addEventListener('change', (e) => {
        currentMonth = e.target.value;
        applyMonthFilter(currentMonth);
    });
});

let rawDashboardData = [];
let dashboardData = [];
let availableMonths = [];
let currentMonth = '';
let chartInstances = {};
let currentGid = '0';

const GOOGLE_SHEET_BASE_URL = 'https://docs.google.com/spreadsheets/d/1KXaHlxAGlV0P-w16A3K7XbNCYdL1Gv9jxOGaQHpT1BU/gviz/tq?tqx=out:csv';

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-menu .nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            currentGid = item.getAttribute('data-gid') || '0';
            
            document.getElementById('loader').classList.remove('hidden');
            document.getElementById('dashboard-content').classList.add('hidden');
            
            initDashboard();
        });
    });
}

function initDashboard() {
    const loaderText = document.querySelector('#loader p');
    if (loaderText) loaderText.innerText = "กำลังเชื่อมต่อกับ Google Sheets...";

    const url = `${GOOGLE_SHEET_BASE_URL}&gid=${currentGid}`;

    Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            try {
                processData(results.data);
                
                document.getElementById('loader').classList.add('hidden');
                document.getElementById('dashboard-content').classList.remove('hidden');
            } catch (error) {
                showError("เกิดข้อผิดพลาดในการประมวลผลข้อมูล", error.message);
            }
        },
        error: function(error) {
            let errorMsg = error.message || error;
            if (String(errorMsg).includes("ProgressEvent")) {
                errorMsg = "ไม่สามารถเชื่อมต่อกับ Google Sheets ได้ (อาจเกิดจากปัญหาเครือข่าย หรือไฟล์อาจยังไม่เปิดเป็นสาธารณะ)";
            }
            showError("เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheets", errorMsg);
        }
    });
}

function initModal() {
    const modal = document.getElementById('detailsModal');
    const closeBtn = document.getElementById('closeModalBtn');
    
    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });
    
    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

function showError(title, message) {
    console.error(title, message);
    document.getElementById('loader').innerHTML = `
        <div style="color: var(--accent-red); text-align: center;">
            <i class="ph ph-warning-circle" style="font-size: 48px;"></i>
            <p style="margin-top: 16px;">${title}</p>
            <p style="font-size: 14px; color: var(--text-muted); margin-top: 8px;">${message}</p>
        </div>
    `;
}

function parseNumber(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const cleanStr = val.replace(/,/g, '').trim();
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
}

function processData(rows) {
    rawDashboardData = [];
    const groupedData = {};
    const monthSet = new Set();

    rows.forEach(row => {
        const keys = Object.keys(row);
        const idKey = keys.find(k => k.includes('AssetID'));
        const nameKey = keys.find(k => k.includes('Asset_name'));
        const typeKey = keys.find(k => k.includes('Asset_type'));
        
        if (!idKey || !nameKey) return;
        
        const id = row[idKey] || '';
        const name = row[nameKey] || '';
        const type = row[typeKey] || '';
        
        if (!name || name.trim() === '') return;

        const uniqueKey = name.trim();
        
        if (!groupedData[uniqueKey]) {
            groupedData[uniqueKey] = {
                id: rawDashboardData.length + 1,
                name: uniqueKey,
                type: type.trim(),
                gfmis: 0,
                accrual: 0,
                diff: 0,
                monthly: {}
            };
            rawDashboardData.push(groupedData[uniqueKey]);
        }

        const monthKeys = keys.filter(k => k.includes('-68') || k.includes('-69') || k.match(/[ก-ฮ]\.[ก-ฮ]\.-/));
        const isGfmis = id.includes('GF');
        
        // Extract data for all months
        monthKeys.forEach(mKey => {
            const cleanMonth = mKey.trim();
            monthSet.add(cleanMonth);
            if (!groupedData[uniqueKey].monthly[cleanMonth]) {
                groupedData[uniqueKey].monthly[cleanMonth] = { gfmis: 0, accrual: 0 };
            }
            const val = parseNumber(row[mKey]);
            if (isGfmis) {
                groupedData[uniqueKey].monthly[cleanMonth].gfmis = val;
            } else {
                groupedData[uniqueKey].monthly[cleanMonth].accrual = val;
            }
        });
    });

    availableMonths = Array.from(monthSet);
    if (availableMonths.length > 0) {
        if (!currentMonth || (currentMonth !== 'all' && !availableMonths.includes(currentMonth))) {
            currentMonth = 'all';
        }
    }

    populateMonthFilter();
    applyMonthFilter(currentMonth);
}

function populateMonthFilter() {
    const select = document.getElementById('monthFilter');
    if (!select) return;
    
    select.innerHTML = '';
    
    // Add "ทั้งหมด" option
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'ทั้งหมด';
    if (currentMonth === 'all') allOption.selected = true;
    select.appendChild(allOption);

    availableMonths.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month;
        if (month === currentMonth) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

function applyMonthFilter(month) {
    if (!month) {
        dashboardData = [];
        updateUI();
        return;
    }

    // Process rawDashboardData to create dashboardData for the selected month
    dashboardData = [];
    rawDashboardData.forEach(item => {
        let gfmis = 0;
        let accrual = 0;
        
        if (month === 'all') {
            // Find the latest value available in all months for this item
            for (let i = availableMonths.length - 1; i >= 0; i--) {
                const m = availableMonths[i];
                const md = item.monthly[m];
                if (md && (md.gfmis !== 0 || md.accrual !== 0)) {
                    gfmis = md.gfmis;
                    accrual = md.accrual;
                    break;
                }
            }
        } else {
            const monthData = item.monthly[month] || { gfmis: 0, accrual: 0 };
            gfmis = monthData.gfmis;
            accrual = monthData.accrual;
        }
        
        const newItem = {
            ...item,
            gfmis: gfmis,
            accrual: accrual,
            diff: gfmis - accrual
        };
        
        if (newItem.gfmis !== 0 || newItem.accrual !== 0 || newItem.diff !== 0) {
            dashboardData.push(newItem);
        }
    });

    updateUI();
}

function updateUI() {
    const totalGfmis = dashboardData.reduce((sum, item) => sum + item.gfmis, 0);
    const totalAccrual = dashboardData.reduce((sum, item) => sum + item.accrual, 0);
    const totalDiff = dashboardData.reduce((sum, item) => sum + item.diff, 0);
    
    document.getElementById('totalGfmis').innerText = formatCurrency(totalGfmis);
    document.getElementById('totalAccrual').innerText = formatCurrency(totalAccrual);
    
    const diffEl = document.getElementById('totalDiff');
    const diffPctEl = document.getElementById('totalDiffPct');
    diffEl.innerText = formatCurrency(totalDiff);
    
    let totalPct = 0;
    if (totalGfmis !== 0) {
        totalPct = (totalDiff / totalGfmis) * 100;
    } else if (totalDiff !== 0) {
        totalPct = 100;
    }
    
    let pctSign = totalPct > 0 ? '+' : '';
    if (diffPctEl) {
        diffPctEl.innerText = `${pctSign}${formatCurrency(totalPct)}%`;
    }
    
    if (totalDiff > 0) {
        diffEl.style.color = 'var(--accent-green)';
        if (diffPctEl) diffPctEl.style.color = 'var(--accent-green)';
    } else if (totalDiff < 0) {
        diffEl.style.color = 'var(--accent-red)';
        if (diffPctEl) diffPctEl.style.color = 'var(--accent-red)';
    } else {
        diffEl.style.color = '';
        if (diffPctEl) diffPctEl.style.color = 'var(--text-muted)';
    }
    
    document.getElementById('totalItems').innerText = dashboardData.length.toLocaleString();
    
    renderTable();
    renderCharts();
}

function renderTable() {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';
    
    dashboardData.forEach((item, index) => {
        const tr = document.createElement('tr');
        
        let diffClass = '';
        if (item.diff > 0) diffClass = 'val-positive';
        else if (item.diff < 0) diffClass = 'val-negative';
        
        let pct = 0;
        if (item.gfmis !== 0) {
            pct = (item.diff / item.gfmis) * 100;
        } else if (item.diff !== 0) {
            pct = 100;
        }
        let pctSign = pct > 0 ? '+' : '';
        
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <strong class="clickable-name" data-id="${item.id}">${item.name}</strong>
                <div class="text-muted" style="font-size: 12px; margin-top: 4px;">${item.type}</div>
            </td>
            <td class="text-right">${formatCurrency(item.gfmis)}</td>
            <td class="text-right">${formatCurrency(item.accrual)}</td>
            <td class="text-right ${diffClass}">${formatCurrency(item.diff)}</td>
            <td class="text-right ${diffClass}">${pctSign}${formatCurrency(pct)}%</td>
        `;
        tbody.appendChild(tr);
    });
    
    document.querySelectorAll('.clickable-name').forEach(el => {
        el.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.getAttribute('data-id'));
            openModal(id);
        });
    });
}

function openModal(itemId) {
    const item = dashboardData.find(d => d.id === itemId);
    if (!item) return;
    
    document.getElementById('modalTitle').innerText = `รายการ: ${item.name}`;
    const tbody = document.getElementById('modalTableBody');
    tbody.innerHTML = '';
    
    Object.keys(item.monthly).forEach(month => {
        const data = item.monthly[month];
        const gfmis = data.gfmis;
        const accrual = data.accrual;
        
        // Skip if both are zero
        if (gfmis === 0 && accrual === 0) return;
        
        const diff = gfmis - accrual;
        let pct = 0;
        if (gfmis !== 0) {
            pct = (diff / gfmis) * 100;
        } else if (diff !== 0) {
            pct = 100; // If gfmis is 0 but diff exists, it's 100% diff
        }
        
        let diffClass = '';
        if (diff > 0) diffClass = 'val-positive';
        else if (diff < 0) diffClass = 'val-negative';
        
        let pctSign = pct > 0 ? '+' : '';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${month}</strong></td>
            <td class="text-right">${formatCurrency(gfmis)}</td>
            <td class="text-right">${formatCurrency(accrual)}</td>
            <td class="text-right ${diffClass}">${formatCurrency(diff)}</td>
            <td class="text-right ${diffClass}">${pctSign}${formatCurrency(pct)}%</td>
        `;
        tbody.appendChild(tr);
    });
    
    if (tbody.innerHTML === '') {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding:20px; color:var(--text-muted);">ไม่มีข้อมูลรายเดือน</td></tr>';
    }
    
    document.getElementById('detailsModal').classList.remove('hidden');
}

function renderCharts() {
    const colorGfmis = 'rgba(59, 130, 246, 0.8)';
    const colorAccrual = 'rgba(16, 185, 129, 0.8)';
    const colorText = '#94a3b8';
    const colorGrid = 'rgba(255, 255, 255, 0.05)';
    
    const topValueData = [...dashboardData]
        .sort((a, b) => Math.max(b.gfmis, b.accrual) - Math.max(a.gfmis, a.accrual))
        .slice(0, 10);
        
    const labels = topValueData.map(d => d.name);
    
    const ctxComp = document.getElementById('comparisonChart').getContext('2d');
    if (chartInstances.comparison) chartInstances.comparison.destroy();
    
    chartInstances.comparison = new Chart(ctxComp, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'GFMIS',
                    data: topValueData.map(d => d.gfmis),
                    backgroundColor: colorGfmis,
                    borderRadius: 4
                },
                {
                    label: 'บัญชีเกณฑ์ค้าง',
                    data: topValueData.map(d => d.accrual),
                    backgroundColor: colorAccrual,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: colorText, font: { family: 'Outfit' } } }
            },
            scales: {
                y: { 
                    grid: { color: colorGrid },
                    ticks: { color: colorText, callback: function(value) { return formatCurrencyCompact(value); } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: colorText, font: { family: 'Prompt' } }
                }
            }
        }
    });
    
    const ctxDiff = document.getElementById('diffChart').getContext('2d');
    if (chartInstances.diff) chartInstances.diff.destroy();
    
    const topDiffData = [...dashboardData]
        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
        .slice(0, 10);
        
    const diffData = topDiffData.filter(d => Math.abs(d.diff) > 0);
    const diffLabels = diffData.map(d => d.name);
    const diffValues = diffData.map(d => Math.abs(d.diff));
    
    const bgColors = diffData.map((d, i) => {
        const op = 1 - (i * 0.1);
        return d.diff > 0 ? `rgba(245, 158, 11, ${op})` : `rgba(239, 68, 68, ${op})`;
    });
    
    if (diffData.length === 0) {
        chartInstances.diff = new Chart(ctxDiff, {
            type: 'doughnut',
            data: {
                labels: ['ไม่มีผลต่าง'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['rgba(255, 255, 255, 0.1)'],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
        return;
    }
    
    chartInstances.diff = new Chart(ctxDiff, {
        type: 'doughnut',
        data: {
            labels: diffLabels,
            datasets: [{
                data: diffValues,
                backgroundColor: bgColors,
                borderWidth: 1,
                borderColor: '#1e293b'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'right',
                    labels: { color: colorText, font: { family: 'Prompt', size: 12 } } 
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const raw = diffData[context.dataIndex].diff;
                            return ' ผลต่าง: ' + formatCurrency(raw) + ' บาท';
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

function formatCurrency(num) {
    if (num === null || num === undefined || isNaN(num)) return '0.00';
    return new Intl.NumberFormat('th-TH', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(num);
}

function formatCurrencyCompact(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return new Intl.NumberFormat('th-TH', { 
        notation: 'compact',
        compactDisplay: 'short'
    }).format(num);
}
