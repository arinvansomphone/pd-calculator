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

// Calculate urea nitrogen (BUN) generation rate (mg BUN/min) from nPNA (g/kg/day)
// G (mg BUN/min) = nPNA (g/kg/day) × weight (kg) × 1000 / (12 × 1440)
// Factor of 12 = 6.25 (g protein/g N) × ~1.92 accounts for the fraction of
// dietary nitrogen that becomes urea nitrogen (matched to reference Excel model)
function computeGeneration(pna, weight) {
    if (!pna || !weight) return '';
    return pna * weight * 1000 / (12 * 1440); // mg BUN/min
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
// Unit system: concentrations in mg/L, volumes in mL, fluxes in mg/min, VoD in mL
function pdCalculator(kru, mtac, volume, gen, volumeData, timeData, ufData, days) {
    // Convert whole plasma clearances to plasma water clearances (÷1.08)
    kru = kru / 1.08;

    const V_mL = volume * 1000;                          // L → mL
    const fillVolume = volumeData.map(v => v * 1000);    // L → mL per exchange
    const numExchange = fillVolume.length;
    const numOfTreatment = days.length;

    const deadTime_min = 15;                             // 15 min dead time
    const deadVolume_mL = 150;                           // mL residual in peritoneum

    // All arrays: minute-by-minute over 7 days
    let plasmaConc    = new Array(7 * 24 * 60).fill(0); // mg/L
    let dialysateConc = new Array(7 * 24 * 60).fill(0); // mg/L
    let amountBody    = new Array(7 * 24 * 60).fill(0); // mg
    let amountDial    = new Array(7 * 24 * 60).fill(0); // mg
    let fluxDial      = new Array(7 * 24 * 60).fill(0); // mg/min (plasma→dialysate)
    let excretion     = new Array(7 * 24 * 60).fill(0); // mg/min (renal)
    let netMovtIn     = new Array(7 * 24 * 60).fill(0); // mg/min (net body change)
    let peakConc      = new Array(numOfTreatment).fill(0); // mg/L, start of each treatment day

    const daysOfWeek = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

    let initial_Concentration = 200; // mg/L starting estimate
    let previousWeekEnd = null;
    const tolerance = 0.1;   // mg/L
    const max_iter  = 10000;
    let steady = 0;
    let iterCount = 0;
    let t = 0;
    let peak_index = 0;
    // Tracks the dialysate concentration left in the dead volume at end of each exchange
    let prevDialysateConc_mgL = 0; // mg/L; 0 for very first exchange of simulation

    while (steady === 0 && iterCount++ < max_iter) {
        t = 0;
        peak_index = 0;
        prevDialysateConc_mgL = 0; // reset each iteration (week restarts)

        for (let day = 0; day < 7; day++) {
            if (days.includes(daysOfWeek[day])) {
                for (let exchange = 0; exchange < numExchange; exchange++) {
                    // uf: mL/min UF rate during this exchange
                    const effectiveTime_min = (timeData[exchange] * 60) - deadTime_min;
                    const uf = ufData[exchange] / effectiveTime_min; // mL/min

                    // Péclet factor (dimensionless): mtac mL/min, uf mL/min
                    const beta = uf / mtac;
                    const f = (1 / beta) - (1 / (Math.exp(beta) - 1));

                    const totalTime_min = timeData[exchange] * 60;
                    const initialTime = t;

                    // --- Start of exchange (fresh dialysate instilled) ---
                    if (t === 0) {
                        // Very first minute: initialize from initial_Concentration
                        plasmaConc[t]    = initial_Concentration;                    // mg/L
                        amountBody[t]    = plasmaConc[t] * V_mL / 1000;             // mg/L × mL / 1000 = mg
                        // Dead volume carries previous end-of-exchange dialysate conc (0 on first exchange)
                        amountDial[t]    = deadVolume_mL * prevDialysateConc_mgL / 1000; // mL × mg/L / 1000 = mg
                        dialysateConc[t] = amountDial[t] / (deadVolume_mL + fillVolume[exchange]) * 1000;
                    } else {
                        // Carry plasma forward from previous minute
                        plasmaConc[t]    = plasmaConc[t - 1] + netMovtIn[t - 1] / V_mL * 1000;
                        amountBody[t]    = amountBody[t - 1] + netMovtIn[t - 1];
                        // Dead volume retains the dialysate concentration from end of previous exchange
                        amountDial[t]    = deadVolume_mL * prevDialysateConc_mgL / 1000;
                        dialysateConc[t] = amountDial[t] / (deadVolume_mL + fillVolume[exchange]) * 1000;
                    }

                    // Flux at exchange start (mg/min):
                    // diffusion: MTAC (mL/min) × ΔC (mg/L) / 1000  [mL/min × mg/L = mL×mg/(L×min) = mg/1000/min → /1000 gives mg/min]
                    // convection: uf (mL/min) × C_plasma_effective (mg/L) / 1000
                    fluxDial[t]  = (plasmaConc[t] - dialysateConc[t]) * mtac / 1000
                                 + (plasmaConc[t] - f * (plasmaConc[t] - dialysateConc[t])) * uf / 1000;
                    excretion[t] = plasmaConc[t] * kru / 1000;                      // mg/L × mL/min / 1000 = mg/min
                    netMovtIn[t] = gen - excretion[t] - fluxDial[t];               // mg/min

                    if (exchange === 0) {
                        peakConc[peak_index++] = plasmaConc[t];
                    }
                    t += 1;

                    // --- Active dwell ---
                    while (t < initialTime + effectiveTime_min) {
                        plasmaConc[t]    = plasmaConc[t - 1] + netMovtIn[t - 1] / V_mL * 1000;
                        amountBody[t]    = amountBody[t - 1] + netMovtIn[t - 1];
                        amountDial[t]    = amountDial[t - 1] + fluxDial[t - 1];    // accumulate urea in dialysate
                        dialysateConc[t] = amountDial[t] / (deadVolume_mL + fillVolume[exchange]) * 1000;
                        fluxDial[t]      = (plasmaConc[t] - dialysateConc[t]) * mtac / 1000
                                         + (plasmaConc[t] - f * (plasmaConc[t] - dialysateConc[t])) * uf / 1000;
                        excretion[t]     = plasmaConc[t] * kru / 1000;
                        netMovtIn[t]     = gen - excretion[t] - fluxDial[t];
                        t += 1;
                    }

                    // Save dialysate concentration at end of active dwell for dead volume carry-forward
                    prevDialysateConc_mgL = dialysateConc[t - 1]; // mg/L

                    // --- Dead time (drain/fill, no mass transfer) ---
                    while (t < initialTime + totalTime_min) {
                        plasmaConc[t]    = plasmaConc[t - 1] + netMovtIn[t - 1] / V_mL * 1000;
                        amountBody[t]    = amountBody[t - 1] + netMovtIn[t - 1];
                        amountDial[t]    = 0;
                        dialysateConc[t] = 0;
                        fluxDial[t]      = 0;
                        excretion[t]     = plasmaConc[t] * kru / 1000;
                        netMovtIn[t]     = gen - excretion[t];
                        t += 1;
                    }
                }
            }

            // --- Non-treatment minutes for the day (no dialysis) ---
            if (t === 0) {
                // Day 0 not a treatment day: initialize
                plasmaConc[t] = initial_Concentration;
                amountBody[t] = plasmaConc[t] * V_mL / 1000;
                amountDial[t] = 0;
                dialysateConc[t] = 0;
                fluxDial[t]   = 0;
                excretion[t]  = plasmaConc[t] * kru / 1000;
                netMovtIn[t]  = gen - excretion[t];
                t += 1;
            }

            while (t < (day + 1) * 24 * 60) {
                plasmaConc[t]    = plasmaConc[t - 1] + netMovtIn[t - 1] / V_mL * 1000;
                amountBody[t]    = amountBody[t - 1] + netMovtIn[t - 1];
                amountDial[t]    = 0;
                dialysateConc[t] = 0;
                fluxDial[t]      = 0;
                excretion[t]     = plasmaConc[t] * kru / 1000;
                netMovtIn[t]     = gen - excretion[t];
                t += 1;
            }
        }
        
        // Steady state: end-of-week concentration stops changing between iterations
        const weekEnd = plasmaConc[t - 1];
        if (previousWeekEnd !== null) {
            const absDiff = Math.abs(weekEnd - previousWeekEnd);
            if (absDiff < tolerance) {
                steady = 1;
                console.log(`Steady state after ${iterCount} iterations: weekEnd=${weekEnd.toFixed(4)} mg/L, diff=${absDiff.toFixed(4)} mg/L`);
            }
        }
        previousWeekEnd = weekEnd;
        initial_Concentration = weekEnd;
    }

    if (iterCount >= max_iter) {
        console.warn(`pdCalculator: max iterations reached without converging. Final weekEnd=${plasmaConc[t-1].toFixed(2)} mg/L`);
    }

    // Log all arrays minute-by-minute for inspection
    const debugTable = [];
    for (let i = 0; i < t; i++) {
        debugTable.push({
            t: i,
            plasmaConc_mgL:     +plasmaConc[i].toFixed(4),
            dialysateConc_mgL:  +dialysateConc[i].toFixed(4),
            amountBody_mg:      +amountBody[i].toFixed(4),
            amountDial_mg:      +amountDial[i].toFixed(4),
            fluxDial_mgPerMin:  +fluxDial[i].toFixed(6),
            excretion_mgPerMin: +excretion[i].toFixed(6),
            netMovtIn_mgPerMin: +netMovtIn[i].toFixed(6),
        });
    }
    console.table(debugTable);

    return {
        plasmaConcentration: plasmaConc,
        peakConcentration: peakConc,
        dialysateConcentration: dialysateConc,
        plasmaToDialysate: fluxDial,
        excretion,
        gen
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
            .filter((_, j) => j % 10 === 0);
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

        // TAC: mean plasma conc over all 10080 minutes (mg/L)
        const tac = plasmaConcentration.reduce((s, v) => s + v, 0) / plasmaConcentration.length;
        // APC: mean of start-of-day peak concentrations (mg/L)
        const apc = peakConcentration.length > 0
            ? peakConcentration.reduce((s, v) => s + v, 0) / peakConcentration.length : 0;
        // Weekly removal: sum of (dialysate flux + renal excretion) in mg/min × 1 min = mg
        const weeklyRemoval = plasmaToDialysate.reduce((s, v) => s + v, 0)
                            + excretion.reduce((s, v) => s + v, 0);
        // stdKt/V = total clearance (mL) / V (mL)
        // total clearance (mL) = weeklyRemoval (mg) / TAC (mg/L) × 1000 (mL/L)
        const V_mL = volume * 1000;
        const ktv = tac > 0 ? (weeklyRemoval / tac * 1000) / V_mL : 0;

        document.getElementById(`ktv-${suffix}`).textContent = ktv.toFixed(2);
        document.getElementById(`apc-${suffix}`).textContent = apc.toFixed(0);
        document.getElementById(`tac-${suffix}`).textContent = tac.toFixed(0);
        document.getElementById(`kurea-${suffix}`).textContent = kru.toFixed(2);
    }

    if (treatmentHistory.length > 0) {
        const { results, inputs } = treatmentHistory[0];
        const { plasmaConcentration, peakConcentration, plasmaToDialysate, excretion } = results;
        const { kru, volume } = inputs;
        const tac = plasmaConcentration.reduce((s, v) => s + v, 0) / plasmaConcentration.length;
        const apc = peakConcentration.length > 0
            ? peakConcentration.reduce((s, v) => s + v, 0) / peakConcentration.length : 0;
        const weeklyRemoval = plasmaToDialysate.reduce((s, v) => s + v, 0)
                            + excretion.reduce((s, v) => s + v, 0);
        const V_mL = volume * 1000;
        const ktv = tac > 0 ? (weeklyRemoval / tac * 1000) / V_mL : 0;
        console.log(`stdKt/V: ${ktv.toFixed(2)}, APC: ${apc.toFixed(2)}, TAC: ${tac.toFixed(2)}, Kurea: ${kru.toFixed(2)}`);
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
        
        console.log('=== pdCalculator inputs ===');
        console.log(`kru=${inputs.kru} mL/min, mtac=${inputs.mtac} mL/min, volume=${inputs.volume} L`);
        console.log(`gen=${inputs.gen?.toFixed(4)} mg/min, nPNA=${document.getElementById('pna').value} g/kg/day, weight=${document.getElementById('weight').value} kg`);
        console.log(`exchanges: ${inputs.volumeData.length}, days: ${inputs.days.join(',')}`);
        console.log(`volumeData (L): ${inputs.volumeData}, timeData (hr): ${inputs.timeData}, ufData (mL): ${inputs.ufData}`);

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
