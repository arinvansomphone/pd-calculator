// Calculate Volume of Distribution of Urea using Watson et al. formulas
function calculateVolume() {
    const age = parseFloat(document.getElementById('age').value);
    const height = parseFloat(document.getElementById('height').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const sex = document.getElementById('sex').value;
    const volumeInput = document.getElementById('volume');
    
    // Check if all required fields are filled
    if (!age || !height || !weight || !sex) {
        volumeInput.value = '';
        return;
    }
    
    let volume;
    if (sex === 'male') {
        // Male Volume: 2.447 - (0.09156 * age) + (0.1074 * height) + (0.3362 * weight)
        volume = 2.447 - (0.09156 * age) + (0.1074 * height) + (0.3362 * weight);
    } else if (sex === 'female') {
        // Female Volume: -2.097 + (0.1069 * height) + (0.2466 * weight)
        volume = -2.097 + (0.1069 * height) + (0.2466 * weight);
    }
    
    // Display volume rounded to 2 decimal places
    if (volume !== undefined) {
        volumeInput.value = volume.toFixed(2);
    }
}

// Calculate urea generation rate from PNA
// PNA is in g/kg/day, so multiply by weight to get total generation
function computeGeneration(pna, weight) {
    if (!pna || !weight) return '';
    return pna * weight * 0.154;
}

// Store treatment results
const treatments = {
    treatment1: null,
    treatment2: null
};

// Gather form inputs for a specific prescription
function gatherPrescriptionInputs(prescriptionNum) {
    const prefix = `p${prescriptionNum}`;
    
    // Get patient data
    const kru = parseFloat(document.getElementById('kru').value);
    const mtacElement = document.getElementById('mtac');
    const mtac = parseFloat(mtacElement.value || mtacElement.options[mtacElement.selectedIndex]?.value);
    const volume = parseFloat(document.getElementById('volume').value);
    const pna = parseFloat(document.getElementById('pna').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const gen = computeGeneration(pna, weight);
    
    // Get selected days
    const days = [];
    const dayIds = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    dayIds.forEach((day, index) => {
        if (document.getElementById(`${prefix}-${day}`).checked) {
            days.push(dayNames[index]);
        }
    });
    
    // Get exchange data
    const volumeData = [];
    const timeData = [];
    const ufData = [];
    const numberData = [];
    
    // Repeated exchanges
    const repNumber = parseFloat(document.getElementById(`${prefix}-rep-number`).value) || 0;
    const repVolume = parseFloat(document.getElementById(`${prefix}-rep-volume`).value) || 0;
    const repTime = parseFloat(document.getElementById(`${prefix}-rep-time`).value) || 0;
    const repUF = parseFloat(document.getElementById(`${prefix}-rep-uf`).value) || 0;
    
    if (repNumber > 0 && repVolume > 0 && repTime > 0) {
        for (let i = 0; i < repNumber; i++) {
            volumeData.push(repVolume);
            timeData.push(repTime / 60); // Convert minutes to hours
            ufData.push(repUF);
        }
    }
    
    // Additional Exchange #1
    const add1Number = parseFloat(document.getElementById(`${prefix}-add1-number`).value) || 0;
    const add1Volume = parseFloat(document.getElementById(`${prefix}-add1-volume`).value) || 0;
    const add1Time = parseFloat(document.getElementById(`${prefix}-add1-time`).value) || 0;
    const add1UF = parseFloat(document.getElementById(`${prefix}-add1-uf`).value) || 0;
    
    if (add1Number > 0 && add1Volume > 0 && add1Time > 0) {
        for (let i = 0; i < add1Number; i++) {
            volumeData.push(add1Volume);
            timeData.push(add1Time / 60); // Convert minutes to hours
            ufData.push(add1UF);
        }
    }
    
    // Additional Exchange #2
    const add2Number = parseFloat(document.getElementById(`${prefix}-add2-number`).value) || 0;
    const add2Volume = parseFloat(document.getElementById(`${prefix}-add2-volume`).value) || 0;
    const add2Time = parseFloat(document.getElementById(`${prefix}-add2-time`).value) || 0;
    const add2UF = parseFloat(document.getElementById(`${prefix}-add2-uf`).value) || 0;
    
    if (add2Number > 0 && add2Volume > 0 && add2Time > 0) {
        for (let i = 0; i < add2Number; i++) {
            volumeData.push(add2Volume);
            timeData.push(add2Time / 60); // Convert minutes to hours
            ufData.push(add2UF);
        }
    }
    
    // Calculate total fluid removal
    const totalUF = ufData.reduce((sum, uf) => sum + uf, 0);
    const totalTime = timeData.reduce((sum, time) => sum + time, 0);
    
    return {
        kru,
        mtac,
        volume,
        gen,
        days,
        volumeData,
        timeData,
        ufData,
        totalUF,
        totalTime
    };
}

// Main PD Calculator function
function pdCalculator(kru, mtac, volume, gen, volumeData, timeData, ufData, days) {
    kru = kru / 1.08;
    
    const scaledVolume = volumeData.map(v => v * 1000); // Convert L to mL
    const numExchange = scaledVolume.length;
    const numOfTreatment = days.length;
    
    const deadTime = 0.25; // 15 minutes in hours
    const deadVolumeDialysate = 150; // mL
    
    // Initialize arrays for minute-by-minute tracking (7 days * 24 hours * 60 minutes)
    let plasmaConcentration = new Array(7 * 24 * 60).fill(0);
    let peakConcentration = new Array(numExchange * numOfTreatment).fill(0);
    let dialysateConcentration = new Array(7 * 24 * 60).fill(0);
    let volumeofDistribution = new Array(7 * 24 * 60).fill(0);
    let volDialysate = new Array(7 * 24 * 60).fill(0);
    let amountDialysate = new Array(7 * 24 * 60).fill(0);
    let plasmaToDialysate = new Array(7 * 24 * 60).fill(0);
    let plasmaToDialysateDiffusion = new Array(7 * 24 * 60).fill(0);
    let plasmaToDialysateConvection = new Array(7 * 24 * 60).fill(0);
    let amountBody = new Array(7 * 24 * 60).fill(0);
    let netMovtIn = new Array(7 * 24 * 60).fill(0);
    let excretion = new Array(7 * 24 * 60).fill(0);
    
    let initial_equilibrium_tolerance = 0.001;
    let initial_steady_state = 0;
    let initial_Concentration = 1;
    let previousWeekProfile = null; // Track previous week's entire profile
    let t = 0;
    let peak_index = 0;
    
    // Calculate average UF rate
    const totalEffectiveTime = timeData.reduce((sum, time) => sum + (time - deadTime), 0);
    const avgUFRate = ufData.reduce((sum, uf) => sum + uf, 0) / (totalEffectiveTime * 60);
    
    const volume_intake = 0; // Simplified for now
    
    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    
    const max_iter = 10000; // Increased from 1000
    let iterCount = 0;
    
    while (initial_steady_state == 0 && iterCount++ < max_iter) {
        t = 0;
        peak_index = 0;
        
        for (let day = 0; day < 7; day++) {
            if (days.includes(daysOfWeek[day])) {
                for (let exchange = 0; exchange < numExchange; exchange++) {
                    const uf = ufData[exchange] / ((timeData[exchange] - deadTime) * 60); // UF rate per minute
                    const beta = uf / mtac;
                    const f = (1 / beta) - (1 / (Math.exp(beta) - 1));
                    
                    const effectiveTime = (timeData[exchange] - deadTime) * 60; // Convert to minutes
                    const totalTime = timeData[exchange] * 60;
                    const initialTime = t;
                    
                    // Start of simulation or reset from dead time
                    if (t == 0 || amountDialysate[t - 1] === 0) {
                        plasmaConcentration[t] = initial_Concentration;
                        volumeofDistribution[t] = volume;
                        volDialysate[t] = deadVolumeDialysate + scaledVolume[exchange];
                        amountDialysate[t] = deadVolumeDialysate / 100 * plasmaConcentration[t];
                        amountBody[t] = plasmaConcentration[t] * volume * 10;
                        dialysateConcentration[t] = amountDialysate[t] / volDialysate[t] * 100;
                        plasmaToDialysateDiffusion[t] = (plasmaConcentration[t] - dialysateConcentration[t]) * mtac / 100;
                        plasmaToDialysateConvection[t] = (plasmaConcentration[t] - f * (plasmaConcentration[t] - dialysateConcentration[t])) * uf / 100;
                        plasmaToDialysate[t] = plasmaToDialysateDiffusion[t] + plasmaToDialysateConvection[t];
                        excretion[t] = plasmaConcentration[t] * kru / 100;
                        netMovtIn[t] = gen - excretion[t] - plasmaToDialysate[t];
                        
                        peakConcentration[peak_index] = plasmaConcentration[t];
                        peak_index += 1;
                        t += 1;
                    } else {
                        // Reset from dead time
                        volumeofDistribution[t] = volumeofDistribution[t - 1] + (volume_intake - uf) / 1000;
                        volDialysate[t] = deadVolumeDialysate + scaledVolume[exchange];
                        amountDialysate[t] = amountDialysate[t - 1] + plasmaToDialysate[t - 1];
                        plasmaConcentration[t] = ((plasmaConcentration[t - 1] * 10 * volumeofDistribution[t - 1]) + netMovtIn[t - 1]) / (volumeofDistribution[t] * 10);
                        dialysateConcentration[t] = amountDialysate[t] / volDialysate[t] * 100;
                        plasmaToDialysateDiffusion[t] = (plasmaConcentration[t] - dialysateConcentration[t]) * mtac / 100;
                        plasmaToDialysateConvection[t] = (plasmaConcentration[t] - f * (plasmaConcentration[t] - dialysateConcentration[t])) * uf / 100;
                        plasmaToDialysate[t] = plasmaToDialysateDiffusion[t] + plasmaToDialysateConvection[t];
                        amountBody[t] = amountBody[t - 1] + netMovtIn[t - 1];
                        excretion[t] = plasmaConcentration[t] * kru / 100;
                        netMovtIn[t] = gen - excretion[t] - plasmaToDialysate[t];
                        
                        peakConcentration[peak_index] = plasmaConcentration[t - 1];
                        peak_index += 1;
                        t += 1;
                    }
                    
                    // During active exchange
                    while (t < (initialTime + effectiveTime)) {
                        volumeofDistribution[t] = volumeofDistribution[t - 1] + (volume_intake - uf) / 1000;
                        volDialysate[t] = volDialysate[t - 1] + uf;
                        amountDialysate[t] = amountDialysate[t - 1] + plasmaToDialysate[t - 1];
                        plasmaConcentration[t] = ((plasmaConcentration[t - 1] * 10 * volumeofDistribution[t - 1]) + netMovtIn[t - 1]) / (volumeofDistribution[t] * 10);
                        dialysateConcentration[t] = amountDialysate[t] / volDialysate[t] * 100;
                        plasmaToDialysateDiffusion[t] = (plasmaConcentration[t] - dialysateConcentration[t]) * mtac / 100;
                        plasmaToDialysateConvection[t] = (plasmaConcentration[t] - f * (plasmaConcentration[t] - dialysateConcentration[t])) * uf / 100;
                        plasmaToDialysate[t] = plasmaToDialysateDiffusion[t] + plasmaToDialysateConvection[t];
                        amountBody[t] = amountBody[t - 1] + netMovtIn[t - 1];
                        excretion[t] = plasmaConcentration[t] * kru / 100;
                        netMovtIn[t] = gen - excretion[t] - plasmaToDialysate[t];
                        t += 1;
                    }
                    
                    // During dead time
                    while (t >= (initialTime + effectiveTime) && t < (initialTime + totalTime)) {
                        plasmaToDialysateDiffusion[t] = 0;
                        plasmaToDialysateConvection[t] = 0;
                        plasmaToDialysate[t] = 0;
                        volDialysate[t] = deadVolumeDialysate;
                        dialysateConcentration[t] = dialysateConcentration[t - 1];
                        amountDialysate[t] = volDialysate[t - 1] * dialysateConcentration[t - 1] / 100;
                        
                        volumeofDistribution[t] = volumeofDistribution[t - 1] + volume_intake / 1000;
                        plasmaConcentration[t] = ((plasmaConcentration[t - 1] * 10 * volumeofDistribution[t - 1]) + netMovtIn[t - 1]) / (volumeofDistribution[t] * 10);
                        amountBody[t] = amountBody[t - 1] + netMovtIn[t - 1];
                        excretion[t] = plasmaConcentration[t] * kru / 100;
                        netMovtIn[t] = gen - excretion[t] - plasmaToDialysate[t];
                        t += 1;
                    }
                }
            }
            
            // Handle first day if not selected
            if (day == 0 && !days.includes(daysOfWeek[day])) {
                plasmaConcentration[t] = initial_Concentration;
                volumeofDistribution[t] = volume;
                plasmaToDialysateDiffusion[t] = 0;
                plasmaToDialysateConvection[t] = 0;
                plasmaToDialysate[t] = 0;
                volDialysate[t] = deadVolumeDialysate;
                amountDialysate[t] = volDialysate[t] / 100 * plasmaConcentration[t];
                dialysateConcentration[t] = amountDialysate[t] / volDialysate[t] * 100;
                amountBody[t] = plasmaConcentration[t] * volume * 10;
                excretion[t] = plasmaConcentration[t] * kru / 100;
                netMovtIn[t] = gen - excretion[t] - plasmaToDialysate[t];
                t += 1;
            }
            
            // Fill rest of the day
            while (t < (day + 1) * (24 * 60)) {
                plasmaToDialysateDiffusion[t] = 0;
                plasmaToDialysateConvection[t] = 0;
                plasmaToDialysate[t] = 0;
                volDialysate[t] = deadVolumeDialysate;
                dialysateConcentration[t] = t > 0 ? dialysateConcentration[t - 1] : 0;
                amountDialysate[t] = t > 0 ? (volDialysate[t - 1] * dialysateConcentration[t - 1] / 100) : 0;
                
                volumeofDistribution[t] = t > 0 ? (volumeofDistribution[t - 1] + volume_intake / 1000) : volume;
                plasmaConcentration[t] = t > 0 ? (((plasmaConcentration[t - 1] * 10 * volumeofDistribution[t - 1]) + netMovtIn[t - 1]) / (volumeofDistribution[t] * 10)) : initial_Concentration;
                amountBody[t] = t > 0 ? (amountBody[t - 1] + netMovtIn[t - 1]) : (plasmaConcentration[t] * volume * 10);
                excretion[t] = plasmaConcentration[t] * kru / 100;
                netMovtIn[t] = gen - excretion[t] - plasmaToDialysate[t];
                t += 1;
            }
        }
        
        // Check for steady state - compare entire week profile to previous week
        const currentWeekStartConcentration = plasmaConcentration[0];
        const currentWeekEndConcentration = plasmaConcentration[t - 1];
        
        // Debug: log actual t value
        if (iterCount <= 5) {
            console.log(`Iteration ${iterCount}: t=${t}, expected=10080, Start=${currentWeekStartConcentration.toFixed(2)}, End=${currentWeekEndConcentration.toFixed(2)}`);
        }
        
        if (previousWeekProfile !== null) {
            // Check key time points throughout the week (every day at midnight)
            let maxDifference = 0;
            let maxRelativeDiff = 0;
            const checkPoints = [];
            
            for (let day = 0; day < 7; day++) {
                const timePoint = day * 24 * 60; // Midnight of each day
                if (timePoint < t && timePoint < previousWeekProfile.length) {
                    const currentValue = plasmaConcentration[timePoint];
                    const previousValue = previousWeekProfile[timePoint];
                    
                    // Sanity check
                    if (isNaN(currentValue) || isNaN(previousValue)) {
                        console.error(`NaN detected at day ${day}: current=${currentValue}, previous=${previousValue}`);
                        continue;
                    }
                    
                    const diff = Math.abs(currentValue - previousValue);
                    const relDiff = diff / previousValue;
                    
                    checkPoints.push({
                        day: daysOfWeek[day],
                        current: currentValue,
                        previous: previousValue,
                        diff: relDiff
                    });
                    
                    if (relDiff > maxRelativeDiff) {
                        maxRelativeDiff = relDiff;
                        maxDifference = diff;
                    }
                }
            }
            
            if (maxRelativeDiff < initial_equilibrium_tolerance) {
                initial_steady_state = 1;
                console.log(`Steady state reached after ${iterCount} iterations`);
                console.log(`Week start: ${currentWeekStartConcentration.toFixed(2)} mg/L, Week end: ${currentWeekEndConcentration.toFixed(2)} mg/L`);
                console.log(`Max difference across all checkpoints: ${maxDifference.toFixed(4)} mg/L (${(maxRelativeDiff * 100).toFixed(4)}%)`);
                checkPoints.forEach(cp => {
                    console.log(`  ${cp.day}: ${cp.current.toFixed(2)} vs ${cp.previous.toFixed(2)} (${(cp.diff * 100).toFixed(4)}%)`);
                });
            } else {
                if (iterCount % 50 === 0 || iterCount <= 10) {
                    console.log(`Iteration ${iterCount}: Start=${currentWeekStartConcentration.toFixed(2)}, End=${currentWeekEndConcentration.toFixed(2)}, MaxDiff=${(maxRelativeDiff * 100).toFixed(3)}%`);
                    if (iterCount <= 10) {
                        // Show first few checkpoints for debugging
                        checkPoints.slice(0, 3).forEach(cp => {
                            console.log(`  ${cp.day}: ${cp.current.toFixed(2)} vs ${cp.previous.toFixed(2)} (${(cp.diff * 100).toFixed(3)}%)`);
                        });
                    }
                }
            }
        }
        
        // Store current week's profile and update for next iteration
        previousWeekProfile = plasmaConcentration.slice(0, t); // Copy current week
        initial_Concentration = currentWeekEndConcentration;
    }
    
    if (iterCount >= max_iter) {
        console.warn("pdCalculator: reached maximum iterations without converging");
        console.warn(`Final week: Start=${plasmaConcentration[0].toFixed(2)}, End=${plasmaConcentration[t-1].toFixed(2)}`);
    }
    
    return {
        plasmaConcentration,
        volumeofDistribution,
        peakConcentration,
        dialysateConcentration,
        volDialysate,
        gen,
        plasmaToDialysate,
        excretion
    };
}

// Update graph with treatment data
function updateGraphWithTreatment(treatmentNum, results) {
    const timeData = [];
    const concentrationData = [];
    
    // Sample every 10 minutes to reduce data points for better performance
    for (let i = 0; i < results.plasmaConcentration.length; i += 10) {
        timeData.push(i);
        concentrationData.push(results.plasmaConcentration[i]);
    }
    
    // Get both treatment data
    const treatment1Data = treatments.treatment1 ? 
        treatments.treatment1.plasmaConcentration.filter((_, i) => i % 10 === 0) : [];
    const treatment2Data = treatments.treatment2 ? 
        treatments.treatment2.plasmaConcentration.filter((_, i) => i % 10 === 0) : [];
    
    // Calculate averages
    const treatment1Avg = treatment1Data.length > 0 ?
        treatment1Data.reduce((sum, val) => sum + val, 0) / treatment1Data.length : null;
    const treatment2Avg = treatment2Data.length > 0 ?
        treatment2Data.reduce((sum, val) => sum + val, 0) / treatment2Data.length : null;
    
    // Update the graph from graph.js
    if (typeof updateGraph === 'function') {
        updateGraph(timeData, treatment1Data, treatment2Data, treatment1Avg, treatment2Avg);
    }
}

// Update results table
function updateResults(treatmentNum, results, inputs) {
    const { plasmaConcentration, peakConcentration, gen, plasmaToDialysate, excretion } = results;
    const { kru, volume } = inputs;
    
    // Calculate averages
    const sumPlasma = plasmaConcentration.reduce((sum, val) => sum + val, 0);
    const avgPlasma = sumPlasma / plasmaConcentration.length;
    
    const sumPeak = peakConcentration.reduce((sum, val) => sum + val, 0);
    const avgPeak = sumPeak / peakConcentration.length;
    
    const sumDialysate = plasmaToDialysate.reduce((sum, val) => sum + val, 0);
    const sumExcretion = excretion.reduce((sum, val) => sum + val, 0);
    
    // Calculate Kt/V
    const ktv = (sumDialysate + sumExcretion) / sumPlasma * plasmaConcentration.length / volume * 0.1;
    
    // Update table cells
    const suffix = `tx${treatmentNum}`;
    document.getElementById(`ktv-${suffix}`).textContent = ktv.toFixed(2);
    document.getElementById(`apc-${suffix}`).textContent = avgPlasma.toFixed(2);
    document.getElementById(`tac-${suffix}`).textContent = avgPeak.toFixed(2);
    document.getElementById(`kurea-${suffix}`).textContent = kru.toFixed(2);
    
    console.log(`Treatment ${treatmentNum} Results:`);
    console.log(`stdKt/V: ${ktv.toFixed(2)}`);
    console.log(`APC (avg plasma conc): ${avgPlasma.toFixed(2)} mg/L`);
    console.log(`TAC (time avg conc): ${avgPeak.toFixed(2)} mg/L`);
    console.log(`Kurea: ${kru.toFixed(2)} mL/min`);
}

// Handle run treatment button clicks
function runTreatment(treatmentNum) {
    try {
        const inputs = gatherPrescriptionInputs(treatmentNum);
        
        if (inputs.volumeData.length === 0) {
            alert('Please enter at least one exchange for the prescription.');
            return;
        }
        
        if (inputs.days.length === 0) {
            alert('Please select at least one day of the week.');
            return;
        }
        
        const results = pdCalculator(
            inputs.kru,
            inputs.mtac,
            inputs.volume,
            inputs.gen,
            inputs.volumeData,
            inputs.timeData,
            inputs.ufData,
            inputs.days
        );
        
        treatments[`treatment${treatmentNum}`] = results;
        
        // Update graph
        updateGraphWithTreatment(treatmentNum, results);
        
        // Update results table
        updateResults(treatmentNum, results, inputs);
        
    } catch (error) {
        console.error(`Error running treatment ${treatmentNum}:`, error);
        alert(`Error calculating treatment: ${error.message}`);
    }
}

// Validate if all required inputs are filled for a prescription
function validatePrescription(prescriptionNum) {
    const prefix = `p${prescriptionNum}`;
    
    // Check patient data (required for all prescriptions)
    const age = document.getElementById('age').value;
    const height = document.getElementById('height').value;
    const weight = document.getElementById('weight').value;
    const sex = document.getElementById('sex').value;
    const volume = document.getElementById('volume').value;
    const pna = document.getElementById('pna').value;
    const kru = document.getElementById('kru').value;
    const mtac = document.getElementById('mtac').value;
    
    if (!age || !height || !weight || !sex || !volume || !pna || !kru || !mtac) {
        return false;
    }
    
    // Check if at least one day is selected
    const dayIds = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const hasDay = dayIds.some(day => document.getElementById(`${prefix}-${day}`).checked);
    if (!hasDay) {
        return false;
    }
    
    // Check if at least one exchange has data (all fields must be filled)
    const exchanges = [
        {
            number: document.getElementById(`${prefix}-rep-number`).value,
            volume: document.getElementById(`${prefix}-rep-volume`).value,
            time: document.getElementById(`${prefix}-rep-time`).value,
            uf: document.getElementById(`${prefix}-rep-uf`).value
        },
        {
            number: document.getElementById(`${prefix}-add1-number`).value,
            volume: document.getElementById(`${prefix}-add1-volume`).value,
            time: document.getElementById(`${prefix}-add1-time`).value,
            uf: document.getElementById(`${prefix}-add1-uf`).value
        },
        {
            number: document.getElementById(`${prefix}-add2-number`).value,
            volume: document.getElementById(`${prefix}-add2-volume`).value,
            time: document.getElementById(`${prefix}-add2-time`).value,
            uf: document.getElementById(`${prefix}-add2-uf`).value
        }
    ];
    
    const hasValidExchange = exchanges.some(ex => 
        ex.number && ex.volume && ex.time && ex.uf
    );
    
    return hasValidExchange;
}

// Update button states based on validation
function updateButtonStates() {
    const button1 = document.getElementById('run-treatment-1');
    const button2 = document.getElementById('run-treatment-2');
    
    // Both buttons are enabled only if BOTH prescriptions are valid
    const prescription1Valid = validatePrescription(1);
    const prescription2Valid = validatePrescription(2);
    const bothValid = prescription1Valid && prescription2Valid;
    
    button1.disabled = !bothValid;
    button2.disabled = !bothValid;
}

// Add event listeners to all inputs that affect volume calculation
document.getElementById('age').addEventListener('input', calculateVolume);
document.getElementById('height').addEventListener('input', calculateVolume);
document.getElementById('weight').addEventListener('input', calculateVolume);
document.getElementById('sex').addEventListener('change', calculateVolume);

// Add event listeners to update button states when inputs change
document.addEventListener('DOMContentLoaded', () => {
    // Patient data inputs
    ['age', 'height', 'weight', 'sex', 'pna', 'kru', 'mtac'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updateButtonStates);
            element.addEventListener('change', updateButtonStates);
        }
    });
    
    // Day checkboxes and prescription inputs for both treatments
    [1, 2].forEach(num => {
        const prefix = `p${num}`;
        
        // Day checkboxes
        ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach(day => {
            const checkbox = document.getElementById(`${prefix}-${day}`);
            if (checkbox) {
                checkbox.addEventListener('change', updateButtonStates);
            }
        });
        
        // Exchange inputs
        ['rep', 'add1', 'add2'].forEach(type => {
            ['number', 'volume', 'time', 'uf'].forEach(field => {
                const input = document.getElementById(`${prefix}-${type}-${field}`);
                if (input) {
                    input.addEventListener('input', updateButtonStates);
                }
            });
        });
    });
    
    // Initial button state check
    updateButtonStates();
});

// Add event listeners for run treatment buttons
document.getElementById('run-treatment-1').addEventListener('click', () => runTreatment(1));
document.getElementById('run-treatment-2').addEventListener('click', () => runTreatment(2));
