// Initialize the plasma concentration graph
let plasmaChart = null;

function createCustomLegend() {
    const legendContainer = document.getElementById('customLegend');
    const datasets = [
        { label: 'Treatment 1', color: 'rgb(75, 192, 192)', dashed: false, index: 0 },
        { label: 'Treatment 1 Avg', color: 'rgba(75, 192, 192, 0.5)', dashed: true, index: 1 },
        { label: 'Treatment 2', color: 'rgb(255, 99, 132)', dashed: false, index: 2 },
        { label: 'Treatment 2 Avg', color: 'rgba(255, 99, 132, 0.5)', dashed: true, index: 3 }
    ];
    
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
    
    // Empty data on initialization
    const sampleData = {
        labels: [],
        datasets: [
            {
                label: 'Treatment 1',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.4,
                fill: false
            },
            {
                label: 'Treatment 1 Avg',
                data: [],
                borderColor: 'rgba(75, 192, 192, 0.5)',
                borderWidth: 2,
                borderDash: [5, 5],
                tension: 0,
                fill: false,
                pointRadius: 0
            },
            {
                label: 'Treatment 2',
                data: [],
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.4,
                fill: false
            },
            {
                label: 'Treatment 2 Avg',
                data: [],
                borderColor: 'rgba(255, 99, 132, 0.5)',
                borderWidth: 2,
                borderDash: [5, 5],
                tension: 0,
                fill: false,
                pointRadius: 0
            }
        ]
    };
    
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

// Function to update graph with new data
function updateGraph(timeData, treatment1Data, treatment2Data, treatment1Avg, treatment2Avg) {
    if (plasmaChart) {
        plasmaChart.data.labels = timeData;
        
        // Update datasets in order: T1, T1 Avg, T2, T2 Avg
        plasmaChart.data.datasets[0].data = treatment1Data;
        
        // Update Treatment 1 average line
        if (treatment1Avg !== null && treatment1Data.length > 0) {
            const avgData1 = timeData.map(() => treatment1Avg);
            plasmaChart.data.datasets[1].data = avgData1;
        } else {
            plasmaChart.data.datasets[1].data = [];
        }
        
        // Update Treatment 2 line
        plasmaChart.data.datasets[2].data = treatment2Data;
        
        // Update Treatment 2 average line
        if (treatment2Avg !== null && treatment2Data.length > 0) {
            const avgData2 = timeData.map(() => treatment2Avg);
            plasmaChart.data.datasets[3].data = avgData2;
        } else {
            plasmaChart.data.datasets[3].data = [];
        }
        
        plasmaChart.update();
    }
}

// Initialize the graph when the page loads
window.addEventListener('load', () => {
    createCustomLegend();
    initializeGraph();
});
