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

// Calculate urea generation rate (mg/min) from Entry PNA (g/kg/day)
// PNA (g/day) = nPNA (g/kg/day) × weight (kg)
// ureaN (g/day) = (PNA - 19) / 7.62
// urea (mg/min) = ureaN (g/day) × (60/28) × 1000/1440  [60 g urea per 28 g N]
function computeGeneration(pna, weight) {
    if (!pna || !weight) return '';
    const pnaGperDay = pna * weight;
    const ureaNGperDay = Math.max(0, (pnaGperDay - 19) / 7.62);
    const ureaGperDay = ureaNGperDay * (60 / 28);
    const ureaMgPerMin = ureaGperDay * 1000 / 1440;
    return ureaMgPerMin;
}

// Store treatment results - treatment2 is most recent (for graph); treatmentHistory holds up to 4
const treatments = {
    treatment2: null  // Most recent, used by graph
};
const treatmentHistory = [];  // [{results, inputs}, ...] - index 0 is most recent, max 4

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
    const repTimeTotal = parseFloat(document.getElementById(`${prefix}-rep-time`).value) || 0;
    const repUF = parseFloat(document.getElementById(`${prefix}-rep-uf`).value) || 0;
    
    if (repNumber > 0 && repVolume > 0 && repTimeTotal > 0) {
        const repTimePerExchange = repTimeTotal / repNumber;
        for (let i = 0; i < repNumber; i++) {
            volumeData.push(repVolume);
            timeData.push(repTimePerExchange); // Time in hours per exchange
            ufData.push(repUF);
        }
    }
    
    // Additional Exchange #1
    const add1Number = parseFloat(document.getElementById(`${prefix}-add1-number`).value) || 0;
    const add1Volume = parseFloat(document.getElementById(`${prefix}-add1-volume`).value) || 0;
    const add1TimeTotal = parseFloat(document.getElementById(`${prefix}-add1-time`).value) || 0;
    const add1UF = parseFloat(document.getElementById(`${prefix}-add1-uf`).value) || 0;
    
    if (add1Number > 0 && add1Volume > 0 && add1TimeTotal > 0) {
        const add1TimePerExchange = add1TimeTotal / add1Number;
        for (let i = 0; i < add1Number; i++) {
            volumeData.push(add1Volume);
            timeData.push(add1TimePerExchange); // Time in hours per exchange
            ufData.push(add1UF);
        }
    }
    
    // Additional Exchange #2
    const add2Number = parseFloat(document.getElementById(`${prefix}-add2-number`).value) || 0;
    const add2Volume = parseFloat(document.getElementById(`${prefix}-add2-volume`).value) || 0;
    const add2TimeTotal = parseFloat(document.getElementById(`${prefix}-add2-time`).value) || 0;
    const add2UF = parseFloat(document.getElementById(`${prefix}-add2-uf`).value) || 0;
    
    if (add2Number > 0 && add2Volume > 0 && add2TimeTotal > 0) {
        const add2TimePerExchange = add2TimeTotal / add2Number;
        for (let i = 0; i < add2Number; i++) {
            volumeData.push(add2Volume);
            timeData.push(add2TimePerExchange); // Time in hours per exchange
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
    let peakConcentration = new Array(numOfTreatment).fill(0);
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
    
    let initial_equilibrium_tolerance = 0.1; // mg/L
    let initial_steady_state = 0;
    let initial_Concentration = 200; // mg/L - physiologically reasonable starting estimate
    let previousWeekEnd = null;
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
                        
                        // Record peak at start of first exchange of the day
                        if (exchange === 0) {
                            peakConcentration[peak_index] = plasmaConcentration[t];
                            peak_index += 1;
                        }
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
                        
                        // Record peak at start of first exchange of the day
                        if (exchange === 0) {
                            peakConcentration[peak_index] = plasmaConcentration[t];
                            peak_index += 1;
                        }
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
        
        // Steady state: end-of-week concentration has stopped changing between iterations
        const weekEnd = plasmaConcentration[t - 1];

        if (previousWeekEnd !== null) {
            const absDiff = Math.abs(weekEnd - previousWeekEnd);
            if (absDiff < initial_equilibrium_tolerance) {
                initial_steady_state = 1;
                console.log(`Steady state reached after ${iterCount} iterations: weekEnd=${weekEnd.toFixed(4)}, diff=${absDiff.toFixed(4)} mg/L`);
            }
        }

        previousWeekEnd = weekEnd;
        initial_Concentration = weekEnd;
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

// Update graph with treatment data from treatmentHistory (up to 4 most recent)
function updateGraphWithTreatment(treatmentNum, results) {
    const timeData = [];
    for (let i = 0; i < (treatmentHistory[0]?.results.plasmaConcentration.length || 0); i += 10) {
        timeData.push(i);
    }
    
    const treatmentsData = [];
    for (let i = 0; i < 4; i++) {
        const entry = treatmentHistory[i];
        if (!entry) {
            treatmentsData.push({ data: [], avg: null });
            continue;
        }
        const arr = entry.results.plasmaConcentration
            .filter((_, j) => j % 10 === 0)
            .map(val => val / 1.08);
        const avg = arr.length > 0 ? arr.reduce((sum, val) => sum + val, 0) / arr.length : null;
        treatmentsData.push({ data: arr, avg });
    }
    
    if (typeof updateGraph === 'function') {
        updateGraph(timeData, treatmentsData);
    }
}

// Update results table - populates all 4 columns from treatmentHistory
function updateAllResults() {
    const metrics = ['ktv', 'apc', 'tac', 'kurea'];
    
    for (let col = 1; col <= 4; col++) {
        const entry = treatmentHistory[col - 1];
        const suffix = `tx${col}`;
        
        if (!entry) {
            metrics.forEach(m => {
                const el = document.getElementById(`${m}-${suffix}`);
                if (el) el.textContent = '-';
            });
            continue;
        }
        
        const { results, inputs } = entry;
        const { plasmaConcentration, peakConcentration, plasmaToDialysate, excretion } = results;
        const { kru, volume } = inputs;
        
        const sumPlasma = plasmaConcentration.reduce((sum, val) => sum + val, 0);
        const avgPlasma = sumPlasma / plasmaConcentration.length;
        const sumPeak = peakConcentration.reduce((sum, val) => sum + val, 0);
        const avgPeak = peakConcentration.length > 0 ? sumPeak / peakConcentration.length : 0;
        const sumDialysate = plasmaToDialysate.reduce((sum, val) => sum + val, 0);
        const sumExcretion = excretion.reduce((sum, val) => sum + val, 0);
        const tacPlasma = avgPlasma / 1.08;
        const apcPlasma = avgPeak / 1.08;
        const weeklyRemoval = sumDialysate + sumExcretion;
        const ktv = tacPlasma > 0 ? (weeklyRemoval / 10080) / (tacPlasma / 100) : 0;
        
        document.getElementById(`ktv-${suffix}`).textContent = ktv.toFixed(2);
        document.getElementById(`apc-${suffix}`).textContent = apcPlasma.toFixed(0);
        document.getElementById(`tac-${suffix}`).textContent = tacPlasma.toFixed(0);
        document.getElementById(`kurea-${suffix}`).textContent = kru.toFixed(2);
    }
    
    if (treatmentHistory.length > 0) {
        const { results, inputs } = treatmentHistory[0];
        const { plasmaConcentration, peakConcentration, plasmaToDialysate, excretion } = results;
        const { kru, volume } = inputs;
        const sumPlasma = plasmaConcentration.reduce((sum, val) => sum + val, 0);
        const avgPlasma = sumPlasma / plasmaConcentration.length;
        const sumPeak = peakConcentration.reduce((sum, val) => sum + val, 0);
        const avgPeak = peakConcentration.length > 0 ? sumPeak / peakConcentration.length : 0;
        const sumDialysate = plasmaToDialysate.reduce((sum, val) => sum + val, 0);
        const sumExcretion = excretion.reduce((sum, val) => sum + val, 0);
        const tacPlasma = avgPlasma / 1.08;
        const apcPlasma = avgPeak / 1.08;
        const weeklyRemoval = sumDialysate + sumExcretion;
        const ktv = tacPlasma > 0 ? (weeklyRemoval / 10080) / (tacPlasma / 100) : 0;
        console.log('Treatment 1 (Most Recent) Results:');
        console.log(`stdKt/V: ${ktv.toFixed(2)}, APC: ${apcPlasma.toFixed(2)}, TAC: ${tacPlasma.toFixed(2)}, Kurea: ${kru.toFixed(2)}`);
    }
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
        
        treatments.treatment2 = results;
        treatmentHistory.unshift({ results, inputs });
        if (treatmentHistory.length > 4) treatmentHistory.pop();
        
        // Update graph (shows most recent)
        updateGraphWithTreatment(treatmentNum, results);
        
        // Update results table (all 4 columns)
        updateAllResults();
        
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
    const button2 = document.getElementById('run-treatment-2');
    const prescription2Valid = validatePrescription(2);
    button2.disabled = !prescription2Valid;
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
    
    // Day checkboxes and prescription inputs for treatment 2
    [2].forEach(num => {
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
                    if (field === 'uf') {
                        input.addEventListener('change', () => {
                            const val = parseFloat(input.value);
                            if (input.value !== '' && val === 0) {
                                alert('Warning: A UF of 0 mL means no fluid will be removed during this exchange. Please confirm this is intended.');
                            }
                        });
                    }
                    if (field === 'time') {
                        input.addEventListener('change', () => {
                            const repTime = parseFloat(document.getElementById(`${prefix}-rep-time`).value) || 0;
                            const add1Time = parseFloat(document.getElementById(`${prefix}-add1-time`).value) || 0;
                            const add2Time = parseFloat(document.getElementById(`${prefix}-add2-time`).value) || 0;
                            const totalHours = repTime + add1Time + add2Time;
                            if (totalHours > 24) {
                                alert(`Warning: Total treatment time is ${totalHours.toFixed(1)} hours, which exceeds 24 hours. Please adjust the number of exchanges or dwell times.`);
                            }
                        });
                    }
                }
            });
        });
    });
    
    // Initial button state check
    updateButtonStates();
});

// Add event listener for run treatment button
document.getElementById('run-treatment-2').addEventListener('click', () => runTreatment(2));
