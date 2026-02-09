// Initialize the plasma concentration graph
let plasmaChart = null;

function initializeGraph() {
    const ctx = document.getElementById('plasmaGraph');
    
    // Sample data for demonstration
    const sampleData = {
        labels: [0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600],
        datasets: [
            {
                label: 'Treatment 1',
                data: [80, 70, 65, 62, 60, 58, 57, 56, 55, 54, 53],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                tension: 0.4,
                fill: true
            },
            {
                label: 'Treatment 2',
                data: [80, 72, 68, 65, 63, 61, 60, 59, 58, 57, 56],
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                tension: 0.4,
                fill: true
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
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
                        }
                    }
                },
                title: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time (min)',
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
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Plasma Concentration (mg/dL)',
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
                    beginAtZero: false,
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
function updateGraph(timeData, treatment1Data, treatment2Data) {
    if (plasmaChart) {
        plasmaChart.data.labels = timeData;
        plasmaChart.data.datasets[0].data = treatment1Data;
        plasmaChart.data.datasets[1].data = treatment2Data;
        plasmaChart.update();
    }
}

// Initialize the graph when the page loads
window.addEventListener('load', initializeGraph);
