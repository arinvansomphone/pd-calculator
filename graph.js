// Initialize the plasma concentration graph
let plasmaChart = null;

const TREATMENT_COLORS = [
    'rgb(255, 99, 132)',   // Treatment 1 - red
    'rgb(75, 192, 192)',   // Treatment 2 - teal
    'rgb(54, 162, 235)',   // Treatment 3 - blue
    'rgb(255, 159, 64)'    // Treatment 4 - orange
];
const TREATMENT_LABELS = [
    'Treatment 1',
    'Treatment 2',
    'Treatment 3',
    'Treatment 4'
];

function createCustomLegend() {
    const legendContainer = document.getElementById('customLegend');
    const toRgba = (rgb) => rgb.replace('rgb', 'rgba').replace(')', ', 0.5)');
    const datasets = [];
    for (let i = 0; i < 4; i++) {
        datasets.push({ label: TREATMENT_LABELS[i], color: TREATMENT_COLORS[i], dashed: false, index: i * 2 });
        datasets.push({ label: TREATMENT_LABELS[i] + ' Avg', color: toRgba(TREATMENT_COLORS[i]), dashed: true, index: i * 2 + 1 });
    }
    
    legendContainer.innerHTML = '';
    
    datasets.forEach(dataset => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkbox.id = `legend-${dataset.index}`;
        checkbox.addEventListener('change', () => {
            if (plasmaChart) {
                const meta = plasmaChart.getDatasetMeta(dataset.index);
                meta.hidden = !checkbox.checked;
                plasmaChart.update();
            }
        });
        
        const colorBox = document.createElement('span');
        colorBox.className = dataset.dashed ? 'legend-color dashed' : 'legend-color';
        colorBox.style.backgroundColor = dataset.dashed ? 'transparent' : dataset.color;
        colorBox.style.color = dataset.color;
        
        const label = document.createElement('span');
        label.textContent = dataset.label;
        
        legendItem.appendChild(checkbox);
        legendItem.appendChild(colorBox);
        legendItem.appendChild(label);
        legendContainer.appendChild(legendItem);
    });
}

function initializeGraph() {
    const ctx = document.getElementById('plasmaGraph');
    
    // Empty data on initialization - 4 treatments, each with solid + avg dashed line
    const sampleData = {
        labels: [],
        datasets: []
    };
    for (let i = 0; i < 4; i++) {
        sampleData.datasets.push({
            label: TREATMENT_LABELS[i],
            data: [],
            borderColor: TREATMENT_COLORS[i],
            tension: 0.4,
            fill: false
        });
        sampleData.datasets.push({
            label: TREATMENT_LABELS[i] + ' Avg',
            data: [],
            borderColor: TREATMENT_COLORS[i].replace('rgb', 'rgba').replace(')', ', 0.5)'),
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0,
            fill: false,
            pointRadius: 0
        });
    }
    
    plasmaChart = new Chart(ctx, {
        type: 'line',
        data: sampleData,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            font: {
                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
            },
            plugins: {
                legend: {
                    display: false  // Hide default legend, we'll use custom one
                },
                title: {
                    display: false
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Time',
                        font: {
                            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        font: {
                            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
                        },
                        callback: function(value, index, ticks) {
                            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                            // Only show labels at exact day boundaries
                            if (value % 1440 === 0) {
                                const dayIndex = Math.floor(value / 1440);
                                return days[dayIndex] || '';
                            }
                            return '';
                        },
                        autoSkip: false,
                        maxRotation: 0,
                        minRotation: 0
                    },
                    min: 0,
                    max: 10080,
                    afterBuildTicks: function(axis) {
                        // Force exactly 7 ticks at day boundaries for each day of the week
                        axis.ticks = [0, 1440, 2880, 4320, 5760, 7200, 8640].map(value => ({ value }));
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Plasma Concentration (mg/L)',
                        font: {
                            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        font: {
                            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
                        }
                    },
                    beginAtZero: true,
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
}

// Function to update graph with new data - treatmentsData: [{data, avg}, ...] for up to 4 treatments
function updateGraph(timeData, treatmentsData) {
    if (plasmaChart) {
        plasmaChart.data.labels = timeData;
        
        for (let i = 0; i < 4; i++) {
            const treatment = treatmentsData[i];
            const dataIdx = i * 2;
            const avgIdx = i * 2 + 1;
            
            if (treatment && treatment.data && treatment.data.length > 0) {
                plasmaChart.data.datasets[dataIdx].data = treatment.data;
                plasmaChart.data.datasets[avgIdx].data = treatment.avg !== null
                    ? timeData.map(() => treatment.avg)
                    : [];
            } else {
                plasmaChart.data.datasets[dataIdx].data = [];
                plasmaChart.data.datasets[avgIdx].data = [];
            }
        }
        
        plasmaChart.update();
    }
}

// Initialize the graph when the page loads
window.addEventListener('load', () => {
    createCustomLegend();
    initializeGraph();
});
